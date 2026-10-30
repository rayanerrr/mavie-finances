import Foundation
import SwiftUI

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
    var categories: [Category]?
    init(householdName: String?, people: [String]?, accounts: [Account]?, categories: [Category]? = nil) { self.householdName = householdName; self.people = people; self.accounts = accounts; self.categories = categories }
}

struct Category: Codable, Hashable, Identifiable {
    var id: String { name }
    let name: String
    let kind: String
    let color: String
    let subcategories: [String]
}

struct ExpenseDraft: Codable {
    let kind = "expense"
    let type: String
    let amount: Double
    let description: String
    let category: String
    let subcategory: String?
    let person: String?
    let accountName: String?
    let date: String
    let note: String?
    let createdAt: Date
}

struct MonthResume: Codable {
    let updatedAt: Date
    let householdName: String?
    let month: String
    let monthLabel: String
    let spent: Double
    let income: Double
    let remaining: Double?
    let budgetTotal: Double?
    let byCategory: [ResumeCategory]
    let upcomingFixed: [UpcomingFixed]
    let recent: [RecentPurchase]
    let pendingReceipts: Int
    let previousMonthSpent: Double?
}

struct ResumeCategory: Codable, Identifiable {
    var id: String { name }
    let name: String; let color: String; let total: Double; let pct: Double
}

struct UpcomingFixed: Codable, Identifiable {
    var id: String { "\(name)-\(date)" }
    let name: String; let amount: Double; let date: String; let status: String; let type: String
}

struct RecentPurchase: Codable, Identifiable {
    var id: String { "\(date)-\(description)-\(amount)" }
    let date: String; let description: String; let store: String?; let amount: Double; let type: String; let category: String; let color: String; let source: String?
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
    let expenseId: String?
    let store: String?
    let description: String?
    let amount: Double?
    let category: String?
    let total: Double?
    let itemsCount: Int?
    let error: String?
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func identifier(_ key: CodingKeys) -> String? {
            if let text = try? c.decode(String.self, forKey: key) { return text }
            if let number = try? c.decode(Decimal.self, forKey: key) { return NSDecimalNumber(decimal: number).stringValue }
            return nil
        }
        func number(_ key: CodingKeys) -> Double? {
            let value = (try? c.decode(Double.self, forKey: key)) ?? (try? c.decode(String.self, forKey: key)).flatMap { Double($0.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: ".")) }
            return value.flatMap { $0.isFinite ? $0 : nil }
        }
        status = try? c.decode(String.self, forKey: .status)
        receiptId = identifier(.receiptId); expenseId = identifier(.expenseId)
        store = try? c.decode(String.self, forKey: .store)
        description = try? c.decode(String.self, forKey: .description)
        amount = number(.amount); total = number(.total)
        category = try? c.decode(String.self, forKey: .category)
        itemsCount = (try? c.decode(Int.self, forKey: .itemsCount)) ?? (try? c.decode(String.self, forKey: .itemsCount)).flatMap { Int($0) }
        error = try? c.decode(String.self, forKey: .error)
    }
}

struct SentReceipt: Codable, Identifiable {
    let id: String
    let sentAt: Date
    var kind: String
    var result: ReceiptResult?
    let person: String?
    let accountName: String?
    let note: String?
    let sentDescription: String?
    let sentAmount: Double?
    let pageCount: Int?

    init(id: String, sentAt: Date, kind: String = "receipt", result: ReceiptResult? = nil, person: String? = nil, accountName: String? = nil, note: String? = nil, sentDescription: String? = nil, sentAmount: Double? = nil, pageCount: Int? = nil) {
        self.id = id; self.sentAt = sentAt; self.kind = kind; self.result = result
        self.person = person; self.accountName = accountName; self.note = note
        self.sentDescription = sentDescription; self.sentAmount = sentAmount; self.pageCount = pageCount
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id); sentAt = try c.decode(Date.self, forKey: .sentAt)
        kind = try c.decodeIfPresent(String.self, forKey: .kind) ?? "receipt"; result = try c.decodeIfPresent(ReceiptResult.self, forKey: .result)
        person = try c.decodeIfPresent(String.self, forKey: .person); accountName = try c.decodeIfPresent(String.self, forKey: .accountName); note = try c.decodeIfPresent(String.self, forKey: .note)
        sentDescription = try c.decodeIfPresent(String.self, forKey: .sentDescription); sentAmount = try c.decodeIfPresent(Double.self, forKey: .sentAmount); pageCount = try c.decodeIfPresent(Int.self, forKey: .pageCount)
    }
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
