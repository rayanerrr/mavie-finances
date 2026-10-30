import Foundation
import UIKit
import Combine

@MainActor
final class MaVieModel: ObservableObject {
    @Published var folder = FolderStore()
    @Published var screen: AppScreen = .home
    @Published var images: [UIImage] = []
    @Published var person = ""
    @Published var account = ""
    @Published var note = ""
    @Published private(set) var config = MaVieConfig(householdName: nil, people: [], accounts: [])
    @Published private(set) var history: [SentReceipt] = []
    @Published private(set) var isSending = false
    let queue = QueueStore()
    private let defaults = UserDefaults.standard
    private var observer: NSObjectProtocol?
    private var folderObserver: AnyCancellable?

    enum AppScreen { case home, review, history, settings }

    init() {
        folderObserver = folder.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }
        if let data = defaults.data(forKey: "history"), let saved = try? JSONDecoder().decode([SentReceipt].self, from: data) { history = saved }
        observer = NotificationCenter.default.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.retryQueueAndRefresh() }
        }
        refreshConfig()
    }

    var isConfigured: Bool { folder.folderURL != nil }
    var people: [String] { config.people ?? [] }
    var accounts: [Account] { config.accounts ?? [] }

    func setImages(_ newImages: [UIImage]) {
        images = newImages
        person = defaults.lastPerson ?? people.first ?? ""
        account = defaults.lastAccount ?? accounts.first?.name ?? ""
        screen = .review
    }

    func refreshConfig() {
        _ = folder.withFolder { root in
            guard let data = try? Data(contentsOf: root.appendingPathComponent("config.json")), let loaded = try? JSONDecoder().decode(MaVieConfig.self, from: data) else { return }
            config = loaded
        }
        person = defaults.lastPerson ?? people.first ?? ""
        account = defaults.lastAccount ?? accounts.first?.name ?? ""
        refreshResults()
    }

    func retryQueueAndRefresh() {
        for item in queue.items() {
            guard let data = queue.media(for: item) else { queue.remove(item); continue }
            if write(media: data, ext: item.mediaExtension, id: item.id, companion: item.companion) { queue.remove(item) }
        }
        refreshConfig()
    }

    func send() {
        guard !images.isEmpty else { return }
        isSending = true
        let id = timestampName()
        let ext = images.count == 1 ? "jpg" : "pdf"
        let data = images.count == 1 ? ImagePipeline.jpegData(from: images) : ImagePipeline.pdfData(from: images)
        let companion = Companion(person: person.isEmpty ? nil : person, accountName: account.isEmpty ? nil : account, note: note.isEmpty ? nil : note, capturedAt: Date())
        guard let data else { isSending = false; return }
        defaults.lastPerson = person
        defaults.lastAccount = account
        let wrote = write(media: data, ext: ext, id: id, companion: companion)
        if !wrote { try? queue.save(media: data, ext: ext, companion: companion, id: id) }
        history.insert(SentReceipt(id: id, sentAt: Date(), result: nil), at: 0)
        history = Array(history.prefix(30))
        saveHistory()
        isSending = false
        images = []
        screen = .home
        UINotificationFeedbackGenerator().notificationOccurred(wrote ? .success : .warning)
        refreshResults()
    }

    func refreshResults() {
        guard let root = folder.folderURL else { return }
        let accessed = root.startAccessingSecurityScopedResource()
        defer { if accessed { root.stopAccessingSecurityScopedResource() } }
        let coordinator = NSFileCoordinator(filePresenter: nil)
        var loaded = history
        var error: NSError?
        coordinator.coordinate(readingItemAt: root.appendingPathComponent("Traites"), options: [], error: &error) { directory in
            for index in loaded.indices {
                let url = directory.appendingPathComponent("\(loaded[index].id).result.json")
                try? FileManager.default.startDownloadingUbiquitousItem(at: url)
                if let data = try? Data(contentsOf: url), let result = try? JSONDecoder().decode(ReceiptResult.self, from: data) {
                    loaded[index].result = result
                }
            }
        }
        history = loaded
        saveHistory()
    }

    private func write(media: Data, ext: String, id: String, companion: Companion) -> Bool {
        guard let root = folder.folderURL else { return false }
        let accessed = root.startAccessingSecurityScopedResource()
        defer { if accessed { root.stopAccessingSecurityScopedResource() } }
        let directory = root.appendingPathComponent("A-traiter")
        let mediaURL = directory.appendingPathComponent("\(id).\(ext)")
        let tempURL = directory.appendingPathComponent(".\(id).\(ext)")
        let jsonURL = directory.appendingPathComponent("\(id).json")
        let coordinator = NSFileCoordinator(filePresenter: nil)
        var success = false
        var error: NSError?
        coordinator.coordinate(writingItemAt: directory, options: [], error: &error) { _ in
            do {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                try media.write(to: tempURL, options: .atomic)
                try FileManager.default.moveItem(at: tempURL, to: mediaURL)
                let json = try JSONEncoder().encode(companion)
                try json.write(to: jsonURL, options: .atomic)
                success = true
            } catch { success = false; try? FileManager.default.removeItem(at: tempURL) }
        }
        return success
    }

    private func saveHistory() { if let data = try? JSONEncoder().encode(history) { defaults.set(data, forKey: "history") } }
    private func timestampName() -> String {
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd_HH-mm-ss"
        return "\(formatter.string(from: Date()))_\(String(UUID().uuidString.prefix(4)))"
    }
}
