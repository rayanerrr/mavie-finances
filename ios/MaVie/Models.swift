import Foundation

struct Person: Codable, Hashable, Identifiable {
    var id: String { name }
    let name: String
}

struct Account: Codable, Hashable, Identifiable {
    let id: String
    let name: String
}

struct MaVieConfig: Codable {
    var householdName: String?
    var people: [String]?
    var accounts: [Account]?
}

struct Companion: Codable {
    let person: String?
    let accountName: String?
    let note: String?
    let capturedAt: Date
}

struct ReceiptResult: Codable {
    let status: String?
    let receiptId: String?
    let store: String?
    let total: Double?
    let itemsCount: Int?
    let error: String?
}

struct SentReceipt: Codable, Identifiable {
    let id: String
    let sentAt: Date
    var result: ReceiptResult?
}

struct PendingItem: Codable, Identifiable {
    let id: String
    let mediaExtension: String
    let companion: Companion
}

enum AppColors {
    static let background = Color(red: 13 / 255, green: 15 / 255, blue: 19 / 255)
    static let panel = Color(red: 20 / 255, green: 23 / 255, blue: 29 / 255)
    static let red = Color(red: 242 / 255, green: 54 / 255, blue: 69 / 255)
    static let text = Color(red: 238 / 255, green: 241 / 255, blue: 247 / 255)
    static let muted = Color(red: 139 / 255, green: 148 / 255, blue: 168 / 255)
}

extension UserDefaults {
    var selectedFolderBookmark: Data? {
        get { data(forKey: "selectedFolderBookmark") }
        set { set(newValue, forKey: "selectedFolderBookmark") }
    }
    var lastPerson: String? {
        get { string(forKey: "lastPerson") }
        set { set(newValue, forKey: "lastPerson") }
    }
    var lastAccount: String? {
        get { string(forKey: "lastAccount") }
        set { set(newValue, forKey: "lastAccount") }
    }
}
