import Foundation
import UniformTypeIdentifiers
import UIKit

final class FolderStore: NSObject, ObservableObject, UIDocumentPickerDelegate {
    @Published private(set) var folderURL: URL?
    @Published var showingPicker = false
    private var pickerCompletion: ((Bool) -> Void)?

    override init() {
        super.init()
        restoreBookmark()
    }

    func chooseFolder(from presenter: UIViewController, completion: ((Bool) -> Void)? = nil) {
        pickerCompletion = completion
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder], asCopy: false)
        picker.delegate = self
        picker.allowsMultipleSelection = false
        presenter.present(picker, animated: true)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let url = urls.first else { return }
        do {
            folderURL = url
            folderURL?.startAccessingSecurityScopedResource()
            defer { folderURL?.stopAccessingSecurityScopedResource() }
            let bookmark = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
            UserDefaults.standard.selectedFolderBookmark = bookmark
            try createDirectories(at: url)
            pickerCompletion?(true)
        } catch {
            pickerCompletion?(false)
        }
        pickerCompletion = nil
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pickerCompletion?(false)
        pickerCompletion = nil
    }

    func withFolder<T>(_ operation: @escaping (URL) throws -> T) rethrows -> T? {
        guard let url = folderURL else { return nil }
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let coordinator = NSFileCoordinator(filePresenter: nil)
        var value: T?
        var caught: Error?
        var coordinationError: NSError?
        coordinator.coordinate(readingItemAt: url, options: [], error: &coordinationError) { coordinatedURL in
            do { value = try operation(coordinatedURL) } catch { caught = error }
        }
        if caught == nil, let coordinationError { caught = coordinationError }
        return value
    }

    func createDirectories(at url: URL) throws {
        let fileManager = FileManager.default
        try fileManager.createDirectory(at: url.appendingPathComponent("A-traiter"), withIntermediateDirectories: true)
        try fileManager.createDirectory(at: url.appendingPathComponent("Traites"), withIntermediateDirectories: true)
    }

    private func restoreBookmark() {
        guard let data = UserDefaults.standard.selectedFolderBookmark else { return }
        var stale = false
        do {
            let url = try URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
            folderURL = url
            if stale { UserDefaults.standard.selectedFolderBookmark = try url.bookmarkData(options: []) }
            try? createDirectories(at: url)
        } catch { folderURL = nil }
    }
}
