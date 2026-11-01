import SwiftUI
import UIKit

// Même palette que l'app Mac (design-system/mavie) : clair par défaut, sombre automatique.
enum AppColors {
    static let ledger = Color(light: "f1f5f9", dark: "020617")
    static let sheet = Color(light: "ffffff", dark: "0e1223")
    static let sheet2 = Color(light: "f8fafc", dark: "151b2e")
    static let well = Color(light: "ffffff", dark: "0a1022")
    static let rule = Color(light: "e2e8f0", dark: "1e293b")
    static let ruleStrong = Color(light: "cbd5e1", dark: "334155")
    static let ink = Color(light: "0f172a", dark: "f8fafc")
    static let ink2 = Color(light: "334155", dark: "cbd5e1")
    static let ink3 = Color(light: "526077", dark: "94a3b8")
    static let ink4 = Color(light: "94a3b8", dark: "475569")
    /// Action principale : le bleu du Mac.
    static let stamp = Color(light: "2563eb", dark: "3b82f6")
    static let stampInk = Color.white
    static let paper = Color(hex: "f4f2ec")
    static let paperInk = Color(hex: "26282d")
    static let ok = Color(light: "15803d", dark: "22c55e")
    static let warn = Color(light: "b45309", dark: "f59e0b")
    static let over = Color(light: "dc2626", dark: "ef4444")
    static let background = ledger
    static let panel = sheet
    static let red = over
    static let text = ink
    static let muted = ink3
}

/// Mode d'affichage choisi dans Réglages (comme sur le Mac).
enum AppearanceMode: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }
    var label: String {
        switch self {
        case .system: return "Auto"
        case .light: return "Clair"
        case .dark: return "Sombre"
        }
    }
    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

enum Theme {
    static let controlRadius: CGFloat = 10
    static let panelRadius: CGFloat = 16
    static let dialogRadius: CGFloat = 14
    static let motion = Animation.spring(duration: 0.22, bounce: 0)
}

extension Color {
    /// Couleur qui change selon le mode clair ou sombre.
    init(light: String, dark: String) {
        self.init(uiColor: UIColor { traits in
            UIColor(Color(hex: traits.userInterfaceStyle == .dark ? dark : light))
        })
    }

    init(hex: String) {
        let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0x6b6a65
        self.init(red: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255)
    }
}

extension View {
    func ledgerCard(padding: CGFloat = 16) -> some View {
        self.padding(padding).frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.sheet, in: RoundedRectangle(cornerRadius: Theme.panelRadius))
            .overlay(RoundedRectangle(cornerRadius: Theme.panelRadius).strokeBorder(AppColors.rule, lineWidth: 1))
            .shadow(color: Color.black.opacity(0.05), radius: 10, y: 4)
    }

    func ledgerField(focused: Bool = false) -> some View {
        self.padding(12).frame(minHeight: 48)
            .background(AppColors.well, in: RoundedRectangle(cornerRadius: Theme.controlRadius))
            .overlay(RoundedRectangle(cornerRadius: Theme.controlRadius)
                .strokeBorder(focused ? AppColors.stamp.opacity(0.65) : AppColors.ruleStrong, lineWidth: 1))
    }
}

struct HeroAmount: View {
    let value: Double
    @ScaledMetric(relativeTo: .largeTitle) private var size: CGFloat = 44
    var body: some View {
        Text(money(value)).font(.system(size: size, weight: .bold))
            .tracking(-0.8).monospacedDigit().lineLimit(1).minimumScaleFactor(0.55)
            .accessibilityLabel(money(value))
    }
}

struct SectionTitle: View {
    let text: String
    var body: some View { Text(text).font(.title3.weight(.semibold)).foregroundStyle(AppColors.ink).accessibilityAddTraits(.isHeader) }
}

struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.headline).foregroundStyle(AppColors.stampInk)
            .frame(maxWidth: .infinity).padding(16).frame(minHeight: 52)
            .background(enabled ? AppColors.stamp : AppColors.ink4, in: RoundedRectangle(cornerRadius: Theme.controlRadius))
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(reduceMotion ? nil : Theme.motion, value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.body.weight(.medium)).foregroundStyle(enabled ? AppColors.ink : AppColors.ink4)
            .frame(maxWidth: .infinity).padding(16).frame(minHeight: 52)
            .background(AppColors.sheet2, in: RoundedRectangle(cornerRadius: Theme.controlRadius))
            .overlay(RoundedRectangle(cornerRadius: Theme.controlRadius).strokeBorder(AppColors.ruleStrong, lineWidth: 1))
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(reduceMotion ? nil : Theme.motion, value: configuration.isPressed)
    }
}

struct PressButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.opacity(configuration.isPressed ? 0.75 : 1)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(reduceMotion ? nil : Theme.motion, value: configuration.isPressed)
    }
}

struct Stamp: View {
    let text: String
    var body: some View {
        Text(text).font(.subheadline.weight(.heavy)).padding(.horizontal, 9).padding(.vertical, 5)
            .foregroundStyle(AppColors.stamp)
            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(AppColors.stamp, lineWidth: 2))
            .rotationEffect(.degrees(-5)).fixedSize(horizontal: false, vertical: true)
    }
}

// Les dents se terminent exactement aux coins, quelle que soit la largeur du papier.
struct ReceiptEdge: Shape {
    func path(in rect: CGRect) -> Path {
        let count = max(1, Int(rect.width / 12))
        let step = rect.width / CGFloat(count)
        let depth = min(CGFloat(5), rect.height / 4)
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        for index in 0..<count {
            let x = rect.minX + CGFloat(index) * step
            path.addLine(to: CGPoint(x: x + step / 2, y: rect.minY + depth))
            path.addLine(to: CGPoint(x: x + step, y: rect.minY))
        }
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        for index in 0..<count {
            let x = rect.maxX - CGFloat(index) * step
            path.addLine(to: CGPoint(x: x - step / 2, y: rect.maxY - depth))
            path.addLine(to: CGPoint(x: x - step, y: rect.maxY))
        }
        path.closeSubpath()
        return path
    }
}

struct ReceiptStrip<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }
    var body: some View {
        content.font(.system(.subheadline, design: .monospaced)).monospacedDigit()
            .foregroundStyle(AppColors.paperInk).padding(.horizontal, 20).padding(.vertical, 28)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.paper, in: ReceiptEdge())
            .shadow(color: Color.black.opacity(0.08), radius: 6, y: 2)
    }
}

struct EmptyLedger: View {
    let icon: String
    let title: String
    let message: String
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: icon).font(.system(size: 30, weight: .light)).foregroundStyle(AppColors.ink3).accessibilityHidden(true)
            Text(title).font(.title3.weight(.semibold))
            Text(message).font(.body).foregroundStyle(AppColors.ink2).fixedSize(horizontal: false, vertical: true)
        }.ledgerCard(padding: 24)
    }
}

struct ValueRow: View {
    let label: String
    let value: String
    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .firstTextBaseline) { Text(label).foregroundStyle(AppColors.ink2); Spacer(minLength: 16); Text(value).fontWeight(.semibold).monospacedDigit() }
            VStack(alignment: .leading, spacing: 4) { Text(label).foregroundStyle(AppColors.ink2); Text(value).fontWeight(.semibold).monospacedDigit() }
        }.accessibilityElement(children: .combine)
    }
}

func money(_ value: Double) -> String {
    let formatter = NumberFormatter()
    formatter.locale = Locale(identifier: "fr_CA")
    formatter.numberStyle = .currency
    formatter.currencyCode = "CAD"
    formatter.currencySymbol = "$"
    formatter.minimumFractionDigits = 2
    formatter.maximumFractionDigits = 2
    return formatter.string(from: NSNumber(value: value)) ?? "0,00 $"
}

func ledgerDate(_ raw: String) -> Date? {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.isLenient = false
    return formatter.date(from: raw)
}

func shortDate(_ raw: String) -> String {
    guard let date = ledgerDate(raw) else { return raw }
    return date.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "fr_CA")))
}

func relativeDate(_ date: Date) -> String {
    let formatter = RelativeDateTimeFormatter()
    formatter.locale = Locale(identifier: "fr_CA")
    formatter.unitsStyle = .full
    return formatter.localizedString(for: date, relativeTo: Date())
}

func categoryIcon(_ name: String) -> String {
    switch name {
    case "Alimentation": return "basket"
    case "Logement": return "house"
    case "Transport": return "car"
    case "Magasinage": return "bag"
    case "Restaurants": return "fork.knife"
    case "Santé & Fitness": return "cross.case"
    case "Factures & Services": return "bolt"
    case "Divertissement": return "ticket"
    case "Enfants": return "figure.child"
    case "Revenu": return "banknote"
    default: return "square.grid.2x2"
    }
}
