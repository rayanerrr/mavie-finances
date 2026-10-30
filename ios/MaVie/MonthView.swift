import SwiftUI
import Charts

// Un seul montant domine. Le calendrier explique ensuite ce qui s'en vient.
struct MonthView: View {
    @ObservedObject var model: MaVieModel
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    if let month = model.resume {
                        MonthBalance(month: month)
                        MonthRail(month: month)
                        CategoryBreakdown(categories: month.byCategory)
                        FixedExpenses(items: month.upcomingFixed)
                        recentPurchases(month)
                        Label(month.pendingReceipts == 0 ? "Aucun reçu à vérifier sur ton Mac" : "\(month.pendingReceipts) reçu\(month.pendingReceipts > 1 ? "s" : "") à vérifier sur ton Mac", systemImage: month.pendingReceipts == 0 ? "checkmark.circle" : "laptopcomputer")
                            .font(.subheadline).foregroundStyle(AppColors.ink2).ledgerCard()
                        Text("Mis à jour \(relativeDate(month.updatedAt))").font(.caption).foregroundStyle(AppColors.ink3)
                    } else {
                        EmptyLedger(icon: "calendar", title: "Ton mois prend forme ici", message: "Ouvre MaVie sur ton Mac pour retrouver ton budget, tes achats et les dépenses qui s’en viennent.")
                        Button { model.refreshResume() } label: { Label("Actualiser mon mois", systemImage: "arrow.clockwise") }.buttonStyle(SecondaryButtonStyle())
                        Button("Ajouter un premier achat") { model.screen = .home }.buttonStyle(PrimaryButtonStyle())
                    }
                }.padding(20)
            }
            .background(AppColors.ledger).refreshable { model.retryQueueAndRefresh() }
            .navigationTitle("Mon mois").navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppColors.ledger, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
        }
    }

    private func recentPurchases(_ month: MonthResume) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionTitle(text: "Derniers achats")
            if month.recent.isEmpty {
                Text("Ton prochain achat apparaîtra ici après sa confirmation sur le Mac.").foregroundStyle(AppColors.ink2)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(month.recent.prefix(20).enumerated()), id: \.offset) { index, item in
                        if index > 0 { Divider().overlay(AppColors.rule) }
                        PurchaseRow(item: item).padding(.vertical, 14)
                    }
                }.padding(.horizontal, 16).background(AppColors.sheet, in: RoundedRectangle(cornerRadius: Theme.panelRadius))
            }
        }
    }
}

struct MonthBalance: View {
    let month: MonthResume
    private var hasBudget: Bool { month.budgetRemaining != nil }
    private var remaining: Double { month.budgetRemaining ?? 0 }
    private var ratio: Double { guard let budget = month.budgetTotal, budget > 0 else { return 0 }; return month.spent / budget }
    private var budgetColor: Color { ratio > 1 ? AppColors.over : ratio >= 0.85 ? AppColors.warn : AppColors.ok }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(month.monthLabel.capitalized).font(.title2.weight(.semibold))
            if let name = month.householdName, !name.isEmpty { Text(name).font(.subheadline).foregroundStyle(AppColors.ink3) }
            VStack(alignment: .leading, spacing: 2) {
                Text(hasBudget ? (remaining < 0 ? "Tu dépasses ton budget de" : "Il te reste")
                     : "Tu as dépensé").font(.body.weight(.medium)).foregroundStyle(AppColors.ink2)
                HeroAmount(value: hasBudget ? abs(remaining) : month.spent)
            }.padding(.top, 12)
            Text(comparison).font(.subheadline).foregroundStyle(AppColors.ink2).fixedSize(horizontal: false, vertical: true)
            if hasBudget, let budget = month.budgetTotal {
                VStack(alignment: .leading, spacing: 10) {
                    ProgressView(value: min(max(ratio, 0), 1)).tint(budgetColor)
                        .accessibilityLabel("Budget utilisé").accessibilityValue("\(Int((ratio * 100).rounded())) pour cent")
                    ValueRow(label: "Dépensé", value: "\(money(month.spent)) / \(money(budget))").font(.subheadline)
                    Label(ratio > 1 ? "Budget dépassé" : ratio >= 0.85 ? "Ton budget est presque atteint" : "Dans ton budget", systemImage: ratio > 1 ? "exclamationmark.circle" : ratio >= 0.85 ? "exclamationmark.triangle" : "checkmark.circle")
                        .font(.caption.weight(.medium)).foregroundStyle(budgetColor)
                }.padding(.top, 8)
            }
            ValueRow(label: "Revenus du mois", value: "+\(money(month.income))").font(.subheadline)
                .foregroundStyle(AppColors.ok).padding(.top, 8)
            if let balance = month.remaining {
                ValueRow(label: "Revenus moins dépenses", value: money(balance)).font(.caption).foregroundStyle(AppColors.ink2)
            }
        }
    }
    private var comparison: String {
        guard let previous = month.previousMonthSpent, previous >= 0 else { return "Tes achats confirmés sur le Mac se retrouvent ici." }
        if previous == month.spent { return "Tu as dépensé autant que le mois passé au complet." }
        let direction = month.spent < previous ? "de moins" : "de plus"
        return "\(money(abs(month.spent - previous))) \(direction) que le mois passé au complet."
    }
}

struct MonthRail: View {
    let month: MonthResume
    private let calendar = Calendar(identifier: .gregorian)
    private var start: Date { ledgerDate(month.month + "-01") ?? calendar.startOfDay(for: Date()) }
    private var days: Int { calendar.range(of: .day, in: .month, for: start)?.count ?? 31 }
    private var today: Int? { calendar.isDate(start, equalTo: Date(), toGranularity: .month) ? calendar.component(.day, from: Date()) : nil }
    private var fixed: [UpcomingFixed] { month.upcomingFixed.filter { $0.type != "income" && $0.date.hasPrefix(month.month + "-") } }
    private func day(_ item: UpcomingFixed) -> Int { ledgerDate(item.date).map { calendar.component(.day, from: $0) } ?? 1 }
    private var markedDays: [Int] { Array(Set(fixed.map { day($0) })).sorted() }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionTitle(text: "Le fil du mois")
            if let today { Text("Aujourd’hui, le \(today)").font(.subheadline).foregroundStyle(AppColors.ink2) }
            GeometryReader { proxy in
                let width = max(0, proxy.size.width - 12)
                ZStack(alignment: .topLeading) {
                    Rectangle().fill(AppColors.ruleStrong).frame(width: width, height: 2).offset(x: 6, y: 25)
                    ForEach(1...days, id: \.self) { day in
                        Rectangle().fill(AppColors.ink4).frame(width: 1, height: day == 1 || day == days ? 12 : 5)
                            .offset(x: 6 + width * CGFloat(day - 1) / CGFloat(days - 1), y: 22)
                    }
                    ForEach(markedDays, id: \.self) { markedDay in
                        let entries = fixed.filter { day($0) == markedDay }
                        let x = width * CGFloat(markedDay - 1) / CGFloat(days - 1)
                        if entries.contains(where: { $0.status == "paid" }) {
                            Circle().fill(AppColors.ink2).frame(width: 10, height: 10).offset(x: x + 1, y: 21)
                        }
                        if entries.contains(where: { $0.status != "paid" }) {
                            Circle().fill(AppColors.sheet).overlay(Circle().strokeBorder(AppColors.ink2, lineWidth: 1.5))
                                .frame(width: 10, height: 10).offset(x: x + 1, y: entries.contains(where: { $0.status == "paid" }) ? 36 : 21)
                        }
                    }
                    if let today {
                        let x = width * CGFloat(today - 1) / CGFloat(days - 1)
                        Rectangle().fill(AppColors.stamp).frame(width: 2, height: 25).offset(x: x + 5, y: 0)
                        Circle().fill(AppColors.stamp).frame(width: 6, height: 6).offset(x: x + 3, y: 0)
                    }
                }
            }.frame(height: 48).accessibilityHidden(true)
            HStack { Text("1"); Spacer(); Text("\(days)") }.font(.caption).monospacedDigit().foregroundStyle(AppColors.ink3)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 20) { legend(paid: true); legend(paid: false) }
                VStack(alignment: .leading, spacing: 8) { legend(paid: true); legend(paid: false) }
            }
            if fixed.isEmpty { Text("Aucune dépense fixe prévue dans ce résumé.").font(.caption).foregroundStyle(AppColors.ink3) }
        }.ledgerCard()
        .accessibilityElement(children: .combine)
        .accessibilityValue(fixed.map { "\($0.name), le \(day($0)), \($0.status == "paid" ? "payée" : "à venir")" }.joined(separator: "; "))
    }
    private func legend(paid: Bool) -> some View {
        HStack(spacing: 6) {
            Circle().fill(paid ? AppColors.ink2 : AppColors.sheet).overlay(Circle().strokeBorder(AppColors.ink2, lineWidth: 1))
                .frame(width: 8, height: 8).accessibilityHidden(true)
            Text(paid ? "Payée" : "À venir").font(.caption).foregroundStyle(AppColors.ink2)
        }
    }
}

private struct CategoryBreakdown: View {
    let categories: [ResumeCategory]
    @State private var selection: String?
    private var plotted: [ResumeCategory] {
        let sorted = categories.filter { $0.total > 0 }.sorted { $0.total > $1.total }
        guard sorted.count > 8 else { return sorted }
        let named = sorted.filter { $0.name != "Autres" }
        let first = Array(named.prefix(7))
        let rest = sorted.filter { item in !first.contains(where: { $0.name == item.name }) }
        return first + [ResumeCategory(name: "Autres", color: "#6b6a65", total: rest.reduce(0) { $0 + $1.total }, pct: rest.reduce(0) { $0 + $1.pct })]
    }
    private var total: Double { plotted.reduce(0) { $0 + $1.total } }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionTitle(text: "Où va ton argent")
            if plotted.isEmpty {
                Rectangle().fill(AppColors.ruleStrong).frame(height: 2).padding(.vertical, 16)
                Text("Aucune dépense pour ce mois. Les catégories apparaîtront après ton premier achat confirmé.").foregroundStyle(AppColors.ink2)
            } else {
                Chart(plotted) { category in
                    SectorMark(angle: .value("Dépenses", category.total), innerRadius: .ratio(0.8), angularInset: 2)
                        .foregroundStyle(Color(hex: category.color))
                        .opacity(selection == nil || selection == category.name ? 1 : 0.3)
                        .cornerRadius(3)
                }.frame(height: 176).chartLegend(.hidden).accessibilityHidden(true)
                Text("Touche une catégorie pour l’isoler dans l’anneau.").font(.caption).foregroundStyle(AppColors.ink3)
                VStack(spacing: 4) {
                    ForEach(plotted) { category in
                        Button {
                            selection = selection == category.name ? nil : category.name
                            UISelectionFeedbackGenerator().selectionChanged()
                        } label: {
                            ViewThatFits(in: .horizontal) {
                                HStack(spacing: 10) { categoryName(category); Spacer(minLength: 8); categoryValue(category) }
                                VStack(alignment: .leading, spacing: 8) { categoryName(category); categoryValue(category) }
                            }.padding(.vertical, 8).frame(minHeight: 44).contentShape(Rectangle())
                        }.buttonStyle(PressButtonStyle()).accessibilityAddTraits(selection == category.name ? .isSelected : [])
                    }
                }
            }
        }.ledgerCard()
    }
    private func categoryName(_ category: ResumeCategory) -> some View {
        HStack(spacing: 8) {
            Circle().fill(Color(hex: category.color)).frame(width: 9, height: 9)
            Image(systemName: categoryIcon(category.name)).foregroundStyle(AppColors.ink3).accessibilityHidden(true)
            Text(category.name).foregroundStyle(AppColors.ink)
        }.font(.subheadline)
    }
    private func categoryValue(_ category: ResumeCategory) -> some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text(money(category.total)).fontWeight(.semibold)
            Text("\(Int((category.total / max(total, 0.01) * 100).rounded())) %").font(.caption).foregroundStyle(AppColors.ink3)
        }.font(.subheadline).monospacedDigit().foregroundStyle(AppColors.ink)
    }
}

private struct FixedExpenses: View {
    let items: [UpcomingFixed]
    private var expenses: [UpcomingFixed] { items.filter { $0.type != "income" }.sorted { $0.date < $1.date } }
    private var toCome: Double { expenses.filter { $0.status != "paid" }.reduce(0) { $0 + $1.amount } }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionTitle(text: "Dépenses fixes")
            if expenses.isEmpty {
                Text("Ajoute tes dépenses fixes sur ton Mac pour suivre leurs échéances ici.").foregroundStyle(AppColors.ink2)
            } else {
                ValueRow(label: "À venir dans ce résumé", value: money(toCome)).font(.subheadline)
                VStack(spacing: 0) {
                    ForEach(Array(expenses.enumerated()), id: \.offset) { index, item in
                        if index > 0 { Divider().overlay(AppColors.rule) }
                        VStack(alignment: .leading, spacing: 8) {
                            ValueRow(label: item.name, value: money(item.amount))
                            ViewThatFits(in: .horizontal) {
                                HStack { Text(shortDate(item.date)).foregroundStyle(AppColors.ink3); Spacer(); fixedStatus(item) }
                                VStack(alignment: .leading, spacing: 8) { Text(shortDate(item.date)).foregroundStyle(AppColors.ink3); fixedStatus(item) }
                            }.font(.caption)
                        }.padding(.vertical, 16)
                    }
                }.padding(.horizontal, 16).background(AppColors.sheet, in: RoundedRectangle(cornerRadius: Theme.panelRadius))
            }
        }
    }
    @ViewBuilder private func fixedStatus(_ item: UpcomingFixed) -> some View {
        if item.status == "paid" { Stamp(text: "PAYÉ").accessibilityLabel("Payée") }
        else { Label("À venir", systemImage: "clock").foregroundStyle(AppColors.ink2) }
    }
}

private struct PurchaseRow: View {
    let item: RecentPurchase
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle().fill(Color(hex: item.color)).frame(width: 9, height: 9).padding(.top, 6).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 6) {
                ViewThatFits(in: .horizontal) {
                    HStack(alignment: .firstTextBaseline) { Text(item.description).fontWeight(.medium); Spacer(minLength: 12); amount }
                    VStack(alignment: .leading, spacing: 6) { Text(item.description).fontWeight(.medium); amount }
                }
                Text([item.store, item.category, shortDate(item.date)].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                    .font(.caption).foregroundStyle(AppColors.ink3)
            }
        }.accessibilityElement(children: .combine)
    }
    private var amount: some View {
        Text(item.type == "income" ? "+\(money(item.amount))" : money(item.amount))
            .font(.subheadline.weight(.semibold)).monospacedDigit().fixedSize(horizontal: true, vertical: false)
            .foregroundStyle(item.type == "income" ? AppColors.ok : AppColors.ink)
    }
}

// Présentation seulement : `remaining` reste le solde revenus − dépenses du contrat.
extension MonthResume {
    var budgetRemaining: Double? {
        guard let budget = budgetTotal, budget > 0 else { return nil }
        return budget - spent
    }
    var balanceTitle: String {
        guard let remaining = budgetRemaining else { return "Tu as dépensé" }
        return remaining < 0 ? "Tu dépasses ton budget de" : "Il te reste"
    }
    var balanceAmount: Double { budgetRemaining.map { abs($0) } ?? spent }
}
