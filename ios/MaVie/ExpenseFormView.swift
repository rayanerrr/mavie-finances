import SwiftUI

// La saisie commence par le montant; les choix restent de vrais contrôles iOS.
struct ExpenseFormView: View {
    @ObservedObject var model: MaVieModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @FocusState private var amountFocused: Bool
    @ScaledMetric(relativeTo: .largeTitle) private var amountSize: CGFloat = 44
    @State private var amount = ""
    @State private var description = ""
    @State private var category = "Autres"
    @State private var subcategory = ""
    @State private var type = "expense"
    @State private var date = Date()
    @State private var person = ""
    @State private var account = ""
    @State private var note = ""
    @State private var submitted = false

    private var availableCategories: [Category] { model.categories.filter { type == "income" ? $0.kind == "income" : $0.kind != "income" } }
    private var selectedCategory: Category? { availableCategories.first { $0.name == category } }
    private var parsedAmount: Double? { Double(amount.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)) }
    private var canSubmit: Bool {
        guard let value = parsedAmount else { return false }
        return value.isFinite && value > 0 && !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && selectedCategory != nil && !submitted
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    amountCard
                    if type == "expense" { shortcuts }
                    categoryCard
                    paymentCard
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Note").font(.headline)
                        TextField("Un détail à garder (facultatif)", text: $note, axis: .vertical).lineLimit(2...5).ledgerField()
                    }.ledgerCard()
                }.padding(20)
            }.scrollDismissesKeyboard(.interactively).background(AppColors.ledger)
                .navigationTitle("Sans reçu").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Annuler", action: close).frame(minHeight: 44) }
                    ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Terminé") { amountFocused = false } }
                }
                .toolbarBackground(AppColors.ledger, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
                .safeAreaInset(edge: .bottom) {
                    Button(action: submit) {
                        Text(type == "income" ? "Ajouter le revenu" : "Ajouter la dépense")
                    }.buttonStyle(PrimaryButtonStyle()).disabled(!canSubmit).padding(16).background(AppColors.ledger)
                }
                .onChange(of: category) { _, _ in validateCategory() }
                .onChange(of: type) { _, _ in validateCategory(); UISelectionFeedbackGenerator().selectionChanged() }
                .onChange(of: model.categories) { _, _ in validateCategory() }
                .onAppear {
                    model.refreshConfig()
                    if category == "Autres" { category = availableCategories.first?.name ?? "Autres" }
                    validateCategory()
                    person = model.person
                    account = model.account
                }
                .task {
                    do { try await Task.sleep(for: .milliseconds(200)) } catch { return }
                    amountFocused = true
                }
        }
    }

    private var amountCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Picker("Type d’opération", selection: $type) {
                Text("Dépense").tag("expense")
                Text("Revenu").tag("income")
            }.pickerStyle(.segmented).frame(minHeight: 44)
            Text("Montant").font(.body.weight(.medium)).foregroundStyle(AppColors.ink2)
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                TextField("0,00", text: $amount).keyboardType(.decimalPad).focused($amountFocused)
                    .font(.system(size: amountSize, weight: .semibold)).fontDesign(.serif).monospacedDigit()
                    .accessibilityLabel("Montant en dollars canadiens")
                Text("$").font(.title2).foregroundStyle(AppColors.ink3)
            }.ledgerField(focused: amountFocused)
            if !amount.isEmpty && (parsedAmount == nil || !(parsedAmount?.isFinite ?? false) || (parsedAmount ?? 0) <= 0) {
                Label("Entre un montant plus grand que zéro.", systemImage: "exclamationmark.circle").font(.caption).foregroundStyle(AppColors.warn)
            }
            TextField(type == "income" ? "Description du revenu" : "Description de l’achat", text: $description, axis: .vertical).lineLimit(1...3).ledgerField()
                .accessibilityLabel(type == "income" ? "Description du revenu" : "Description de l’achat")
        }
    }

    private var shortcuts: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(text: "Raccourcis")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    quickChip("Essence", category: "Transport", sub: "Essence")
                    quickChip("Épicerie", category: "Alimentation", sub: nil)
                    quickChip("Restaurant", category: "Restaurants", sub: "Restaurant")
                    quickChip("Café", category: "Restaurants", sub: "Café")
                    quickChip("Stationnement", category: "Transport", sub: "Stationnement")
                    quickChip("Pharmacie", category: "Santé & Fitness", sub: "Pharmacie")
                }.padding(.vertical, 2)
            }
        }
    }

    private var categoryCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionTitle(text: "Catégorie")
            if availableCategories.isEmpty {
                Text("Ajoute une catégorie de ce type sur ton Mac, puis reviens ici.").foregroundStyle(AppColors.ink2)
            }
            LazyVGrid(columns: typeSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(availableCategories) { item in
                    Button {
                        category = item.name
                        UISelectionFeedbackGenerator().selectionChanged()
                    } label: {
                        HStack(spacing: 8) {
                            Circle().fill(Color(hex: item.color)).frame(width: 10, height: 10)
                            Text(item.name).font(.subheadline.weight(.medium)).frame(maxWidth: .infinity, alignment: .leading)
                                .fixedSize(horizontal: false, vertical: true)
                            if category == item.name { Image(systemName: "checkmark").font(.caption.bold()) }
                        }.foregroundStyle(AppColors.ink).padding(12).frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                            .background(category == item.name ? AppColors.sheet2 : AppColors.well, in: RoundedRectangle(cornerRadius: Theme.controlRadius))
                            .overlay(RoundedRectangle(cornerRadius: Theme.controlRadius).strokeBorder(category == item.name ? Color(hex: item.color) : AppColors.ruleStrong, lineWidth: 1))
                    }.buttonStyle(PressButtonStyle()).accessibilityAddTraits(category == item.name ? .isSelected : [])
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                Text("Sous-catégorie").font(.subheadline).foregroundStyle(AppColors.ink2)
                Picker("Sous-catégorie", selection: $subcategory) {
                    Text("Aucune").tag("")
                    ForEach(selectedCategory?.subcategories ?? [], id: \.self) { Text($0).tag($0) }
                }.pickerStyle(.menu).tint(AppColors.ink).frame(minHeight: 44).labelsHidden().accessibilityLabel("Sous-catégorie")
                    .disabled(selectedCategory?.subcategories.isEmpty ?? true)
            }
        }.ledgerCard()
    }

    private var paymentCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionTitle(text: "Détails")
            DatePicker("Date", selection: $date, displayedComponents: .date).frame(minHeight: 44)
            Divider().overlay(AppColors.rule)
            PaymentFields(people: model.people, accounts: model.accounts, person: $person, account: $account, isIncome: type == "income")
        }.ledgerCard()
    }

    @ViewBuilder private func quickChip(_ title: String, category name: String, sub: String?) -> some View {
        if let current = model.categories.first(where: { $0.name == name && $0.kind != "income" }) {
            QuickChip(title, category: name, color: current.color, sub: sub.flatMap { current.subcategories.contains($0) ? $0 : nil }, description: $description, categoryValue: $category, subcategory: $subcategory)
        }
    }
    private func validateCategory() {
        if !availableCategories.contains(where: { $0.name == category }) { category = availableCategories.first?.name ?? "" }
        if !(selectedCategory?.subcategories.contains(subcategory) ?? false) { subcategory = "" }
    }
    private func close() {
        amountFocused = false
        if model.screen == .addExpense { model.screen = .home } else { dismiss() }
    }
    private func submit() {
        guard canSubmit else { return }
        submitted = true
        model.addExpense(type: type, amountText: amount, description: description, category: category,
                         subcategory: subcategory.isEmpty ? nil : subcategory, date: date, person: person, account: account, note: note)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        close()
    }
}

struct QuickChip: View {
    let title: String
    let cat: String
    let color: String
    let sub: String?
    @Binding var description: String
    @Binding var categoryValue: String
    @Binding var subcategory: String
    init(_ title: String, category: String, color: String, sub: String?, description: Binding<String>, categoryValue: Binding<String>, subcategory: Binding<String>) {
        self.title = title; cat = category; self.color = color; self.sub = sub
        _description = description; _categoryValue = categoryValue; _subcategory = subcategory
    }
    private var isSelected: Bool { description == title && categoryValue == cat && subcategory == (sub ?? "") }
    var body: some View {
        Button {
            description = title; categoryValue = cat; subcategory = sub ?? ""
            UISelectionFeedbackGenerator().selectionChanged()
        } label: {
            HStack(spacing: 8) {
                Circle().fill(Color(hex: color)).frame(width: 8, height: 8)
                Text(title).font(.subheadline.weight(.semibold))
                if isSelected { Image(systemName: "checkmark").font(.caption.bold()) }
            }.fixedSize(horizontal: true, vertical: false).padding(.horizontal, 14).padding(.vertical, 10).frame(minHeight: 44)
                .foregroundStyle(AppColors.ink).background(isSelected ? Color(hex: color).opacity(0.2) : AppColors.sheet, in: Capsule())
                .overlay(Capsule().strokeBorder(isSelected ? Color(hex: color) : AppColors.ruleStrong, lineWidth: 1)).contentShape(Capsule())
        }.buttonStyle(PressButtonStyle()).accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

struct PaymentFields: View {
    let people: [String]
    let accounts: [Account]
    @Binding var person: String
    @Binding var account: String
    var isIncome = false
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if !people.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text(isIncome ? "Qui a reçu le revenu ?" : "Qui a payé ?").font(.headline)
                    Picker(isIncome ? "Qui a reçu le revenu ?" : "Qui a payé ?", selection: $person) {
                        Text("Non précisé").tag("")
                        ForEach(people, id: \.self) { Text($0).tag($0) }
                    }.pickerStyle(.menu).labelsHidden().tint(AppColors.ink).frame(minHeight: 44)
                        .accessibilityLabel(isIncome ? "Qui a reçu le revenu ? Facultatif" : "Qui a payé ? Facultatif")
                }
            }
            if !accounts.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text(isIncome ? "Déposé dans" : "Payé avec").font(.headline)
                    Picker(isIncome ? "Déposé dans" : "Payé avec", selection: $account) {
                        Text("Aucun compte").tag("")
                        ForEach(accounts) { Text($0.name).tag($0.name) }
                    }.pickerStyle(.menu).labelsHidden().tint(AppColors.ink).frame(minHeight: 44)
                        .accessibilityLabel(isIncome ? "Compte du dépôt, facultatif" : "Payé avec, facultatif")
                }
            }
            Text(people.isEmpty && accounts.isEmpty ? "Tu peux ajouter les membres du foyer et les comptes dans MaVie sur ton Mac." : "La personne et le compte sont facultatifs.")
                .font(.caption).foregroundStyle(AppColors.ink3)
        }
    }
}
