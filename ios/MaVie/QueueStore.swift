import Foundation

final class QueueStore {
    private let directory: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        directory = base.appendingPathComponent("MaVieQueue", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    func save(media: Data, ext: String, companion: Companion, id: String) throws {
        try media.write(to: directory.appendingPathComponent("\(id).\(ext)"), options: .atomic)
        try encoder.encode(PendingItem(id: id, mediaExtension: ext, companion: companion)).write(to: directory.appendingPathComponent("\(id).json"), options: .atomic)
    }

    func items() -> [PendingItem] {
        guard let urls = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) else { return [] }
        return urls.filter { $0.pathExtension == "json" }.compactMap { try? decoder.decode(PendingItem.self, from: (try? Data(contentsOf: $0)) ?? Data()) }
    }

    func media(for item: PendingItem) -> Data? { try? Data(contentsOf: directory.appendingPathComponent("\(item.id).\(item.mediaExtension)")) }
    func remove(_ item: PendingItem) { try? FileManager.default.removeItem(at: directory.appendingPathComponent("\(item.id).\(item.mediaExtension)")); try? FileManager.default.removeItem(at: directory.appendingPathComponent("\(item.id).json")) }
}
