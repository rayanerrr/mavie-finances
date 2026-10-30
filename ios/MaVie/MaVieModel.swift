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
    @Published private(set) var resume: MonthResume?
    @Published private(set) var isSending = false
    let queue = QueueStore()
    private let defaults = UserDefaults.standard
    private var observer: NSObjectProtocol?
    private var folderObserver: AnyCancellable?
    private var folderURLObserver: AnyCancellable?

    enum AppScreen: Hashable { case home, review, history, month, settings, addExpense }

    init() {
        folderObserver = folder.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }
        if let data = defaults.data(forKey: "history"), let saved = try? JSONDecoder().decode([SentReceipt].self, from: data) { history = saved }
        observer = NotificationCenter.default.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.retryQueueAndRefresh() }
        }
        if let data = defaults.data(forKey: "cachedConfig"), let saved = try? JSONDecoder().decode(MaVieConfig.self, from: data) { config = saved }
        folderURLObserver = folder.$folderURL.dropFirst().sink { [weak self] _ in
            Task { @MainActor in self?.refreshConfig() }
        }
        refreshConfig()
    }

    var isConfigured: Bool { folder.folderURL != nil }
    var people: [String] { config.people ?? [] }
    var accounts: [Account] { config.accounts ?? [] }
    var categories: [Category] { config.categories ?? Self.defaultCategories }

    static let defaultCategories = [
        Category(name: "Alimentation", kind: "essential", color: "#3987e5", subcategories: ["Viande", "Poulet", "Poisson", "Charcuterie", "Produits laitiers", "Légumes", "Fruits", "Pains & céréales", "Autres"]), Category(name: "Logement", kind: "essential", color: "#d95926", subcategories: ["Loyer", "Entretien", "Meubles"]),
        Category(name: "Transport", kind: "essential", color: "#199e70", subcategories: ["Essence", "Covoiturage", "Stationnement", "Entretien auto"]), Category(name: "Magasinage", kind: "essential", color: "#c98500", subcategories: ["Électronique", "Vêtements", "Maison"]),
        Category(name: "Restaurants", kind: "essential", color: "#d55181", subcategories: ["Fast food", "Café", "Restaurant"]), Category(name: "Santé & Fitness", kind: "essential", color: "#008300", subcategories: ["Pharmacie", "Gym", "Médecin"]),
        Category(name: "Factures & Services", kind: "essential", color: "#9085e9", subcategories: ["Électricité", "Internet", "Téléphone", "Assurances"]), Category(name: "Divertissement", kind: "essential", color: "#e66767", subcategories: ["Musique", "Streaming", "Sorties"]),
        Category(name: "Enfants", kind: "essential", color: "#a3a29a", subcategories: ["École", "Activités", "Vêtements", "Jouets"]), Category(name: "Autres", kind: "essential", color: "#6b6a65", subcategories: ["Divers"]), Category(name: "Revenu", kind: "income", color: "#22c55e", subcategories: ["Salaire", "Autre"])
    ]

    func setImages(_ newImages: [UIImage]) {
        images = newImages
        person = defaults.lastPerson ?? people.first ?? ""
        account = defaults.lastAccount ?? accounts.first?.name ?? ""
        screen = .review
    }

    func clearHistory() { history.removeAll() }

    func refreshConfig() {
        if let root = folder.folderURL {
            let accessed = root.startAccessingSecurityScopedResource()
            defer { if accessed { root.stopAccessingSecurityScopedResource() } }
            let url = root.appendingPathComponent("config.json")
            try? FileManager.default.startDownloadingUbiquitousItem(at: url)
            let coordinator = NSFileCoordinator(filePresenter: nil); var error: NSError?
            coordinator.coordinate(readingItemAt: url, options: [], error: &error) { coordinatedURL in
                guard let data = try? Data(contentsOf: coordinatedURL), let loaded = try? JSONDecoder().decode(MaVieConfig.self, from: data) else { return }
                self.config = loaded
                self.defaults.set(data, forKey: "cachedConfig")
            }
        }
        person = defaults.lastPerson ?? people.first ?? ""
        account = defaults.lastAccount ?? accounts.first?.name ?? ""
        refreshResults(); refreshResume()
    }

    func retryQueueAndRefresh() {
        for item in queue.items() {
            guard let data = queue.media(for: item) else { queue.remove(item); continue }
            if write(media: data, ext: item.mediaExtension, id: item.id, companion: item.companion) { queue.remove(item) }
        }
        for id in queue.expenseItems() {
            guard let data = queue.expense(for: id) else { queue.removeExpense(id); continue }
            if write(expense: data, id: id) { queue.removeExpense(id) }
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
        history.insert(SentReceipt(id: id, sentAt: Date()), at: 0)
        history = Array(history.prefix(30))
        saveHistory()
        isSending = false
        images = []
        screen = .home
        UINotificationFeedbackGenerator().notificationOccurred(wrote ? .success : .warning)
        refreshResults()
    }

    func addExpense(type: String, amountText: String, description: String, category: String, subcategory: String?, date: Date, person: String, account: String, note: String) {
        let normalized = amountText.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)
        guard let amount = Double(normalized), amount > 0, !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let id = timestampName(); let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd"
        let expense = ExpenseDraft(type: type, amount: amount, description: description, category: category, subcategory: subcategory, person: person.isEmpty ? nil : person, accountName: account.isEmpty ? nil : account, date: formatter.string(from: date), note: note.isEmpty ? nil : note, createdAt: Date())
        let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(expense) else { return }
        if !write(expense: data, id: id) { try? queue.save(expense: data, id: id) }
        history.insert(SentReceipt(id: id, sentAt: Date(), kind: "expense"), at: 0); history = Array(history.prefix(30)); saveHistory(); refreshResults()
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

    func refreshResume() {
        guard let root = folder.folderURL else { resume = nil; return }
        let accessed = root.startAccessingSecurityScopedResource(); defer { if accessed { root.stopAccessingSecurityScopedResource() } }
        let url = root.appendingPathComponent("resume.json"); try? FileManager.default.startDownloadingUbiquitousItem(at: url)
        let coordinator = NSFileCoordinator(filePresenter: nil); var loaded: MonthResume?; var error: NSError?
        coordinator.coordinate(readingItemAt: url, options: [], error: &error) { coordinatedURL in
            guard let data = try? Data(contentsOf: coordinatedURL) else { return }
            let decoder = JSONDecoder(); decoder.dateDecodingStrategy = .iso8601; loaded = try? decoder.decode(MonthResume.self, from: data)
        }
        resume = loaded
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

    private func write(expense data: Data, id: String) -> Bool {
        guard let root = folder.folderURL else { return false }
        let accessed = root.startAccessingSecurityScopedResource(); defer { if accessed { root.stopAccessingSecurityScopedResource() } }
        let directory = root.appendingPathComponent("A-traiter"), target = directory.appendingPathComponent("\(id).expense.json"), temp = directory.appendingPathComponent(".\(id).expense.json")
        let coordinator = NSFileCoordinator(filePresenter: nil); var success = false; var error: NSError?
        coordinator.coordinate(writingItemAt: directory, options: [], error: &error) { _ in
            do { try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true); try data.write(to: temp, options: .atomic); try FileManager.default.moveItem(at: temp, to: target); success = true } catch { try? FileManager.default.removeItem(at: temp) }
        }
        return success
    }

    private func saveHistory() { if let data = try? JSONEncoder().encode(history) { defaults.set(data, forKey: "history") } }
    private func timestampName() -> String {
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd_HH-mm-ss"
        return "\(formatter.string(from: Date()))_\(String(UUID().uuidString.prefix(4)))"
    }
}
