import SwiftUI
import PhotosUI

struct RootView: View {
    @ObservedObject var model: MaVieModel
    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()
            if !model.isConfigured { WelcomeView(model: model) }
            else {
                switch model.screen {
                case .review: ReviewView(model: model)
                case .settings: SettingsView(model: model)
                case .addExpense: ExpenseFormView(model: model)
                default: TabView(selection: $model.screen) {
                    MonthView(model: model).tabItem { Label("Mon mois", systemImage: "calendar") }.tag(MaVieModel.AppScreen.month)
                    HomeView(model: model).tabItem { Label("Ajouter", systemImage: "plus.circle") }.tag(MaVieModel.AppScreen.home)
                    HistoryView(model: model).tabItem { Label("Envois", systemImage: "paperplane") }.tag(MaVieModel.AppScreen.history)
                }
                }
            }
        }
        .tint(AppColors.red)
    }
}

struct WelcomeView: View {
    @ObservedObject var model: MaVieModel
    @State private var picker = false
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            Spacer()
            Image("Logo").resizable().scaledToFit().frame(width: 72, height: 72)
            Text("MaVie").font(.system(size: 40, weight: .bold))
            Text("Envoie tes reçus à ton Mac, simplement.").foregroundStyle(AppColors.muted)
            VStack(alignment: .leading, spacing: 18) {
                Step(number: "1", text: "Ouvre MaVie sur ton Mac une fois")
                Step(number: "2", text: "Choisis iCloud Drive › MaVie")
                Step(number: "3", text: "C'est prêt")
            }
            Spacer()
            Button("Choisir le dossier MaVie") { picker = true }
                .buttonStyle(PrimaryButtonStyle())
        }
        .padding(24)
        .background(DocumentPickerPresenter(store: model.folder, isPresented: $picker).frame(width: 0, height: 0))
    }
}

struct Step: View {
    let number: String; let text: String
    var body: some View { HStack { Text(number).font(.headline).frame(width: 32, height: 32).background(AppColors.red).clipShape(Circle()); Text(text) } }
}

struct HomeView: View {
    @ObservedObject var model: MaVieModel
    @State private var camera = false
    @State private var photoItem: PhotosPickerItem?
    @State private var expenseForm = false
    var body: some View {
        VStack(spacing: 22) {
            HStack { Text("Ajouter").font(.largeTitle.bold()); Spacer(); Button { model.screen = .settings } label: { Image(systemName: "gearshape") }.accessibilityLabel("Réglages") }
            Spacer()
            Button { camera = true } label: {
                VStack(spacing: 12) { Image(systemName: "doc.viewfinder").font(.system(size: 46)); Text("Scanner un reçu").font(.title2.bold()) }
                    .frame(maxWidth: .infinity).frame(height: 190)
            }.buttonStyle(PrimaryButtonStyle())
            PhotosPicker(selection: $photoItem, matching: .images) { Label("Importer une photo", systemImage: "photo") }.buttonStyle(SecondaryButtonStyle())
            Button("Ajouter sans reçu") { expenseForm = true }.buttonStyle(SecondaryButtonStyle())
            Spacer()
            HStack { Button("Historique") { model.refreshResults(); model.screen = .history }; Spacer(); Text("Dossier configuré").font(.caption).foregroundStyle(AppColors.muted) }
        }
        .padding(24)
        .sheet(isPresented: $camera) { CameraView(onImages: model.setImages, onCancel: { camera = false }).ignoresSafeArea() }
        .sheet(isPresented: $expenseForm) { ExpenseFormView(model: model) }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task { if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) { await MainActor.run { model.setImages([image]); photoItem = nil } } }
        }
    }
}

struct MonthView: View {
    @ObservedObject var model: MaVieModel
    var body: some View {
        ScrollView {
            if let month = model.resume {
                VStack(alignment: .leading, spacing: 24) {
                    Text(month.householdName ?? "Mon mois").font(.largeTitle.bold())
                    VStack(alignment: .leading, spacing: 4) {
                        Text(month.remaining.map { "Il te reste \(money($0))" } ?? "Dépensé \(money(month.spent))").font(.system(size: 38, weight: .semibold, design: .serif)).foregroundStyle(AppColors.text)
                        Text(month.monthLabel.capitalized).foregroundStyle(AppColors.muted)
                    }
                    HStack { Metric(label: "Dépensé", value: money(month.spent), variation: variation(month.spent, month.previousMonthSpent, lowerIsBetter: true)); Metric(label: "Revenus", value: money(month.income), variation: nil) }
                    SectionTitle(text: "Par catégorie")
                    ForEach(month.byCategory) { category in
                        VStack(alignment: .leading, spacing: 5) { HStack { Circle().fill(Color(hex: category.color)).frame(width: 9, height: 9); Text(category.name); Spacer(); Text("\(money(category.total)) · \(Int(category.pct.rounded())) %").foregroundStyle(AppColors.muted) }; GeometryReader { proxy in RoundedRectangle(cornerRadius: 3).fill(Color(hex: category.color)).frame(width: proxy.size.width * min(max(category.pct / 100, 0), 1), height: 6) }.frame(height: 6) }
                    }
                    if !month.upcomingFixed.isEmpty { SectionTitle(text: "Prochaines dépenses fixes"); ForEach(month.upcomingFixed) { item in HStack { VStack(alignment: .leading) { Text(item.name); Text(item.date).font(.caption).foregroundStyle(AppColors.muted) }; Spacer(); Text(money(item.amount)); Text(item.status == "paid" ? "Payé" : "À venir").font(.caption.bold()).foregroundStyle(item.status == "paid" ? .green : .orange).padding(5).background((item.status == "paid" ? Color.green : Color.orange).opacity(0.15)).clipShape(Capsule()) } } }
                    SectionTitle(text: "Derniers achats")
                    ForEach(month.recent.prefix(20)) { item in HStack { VStack(alignment: .leading) { Text(item.description); Text(item.store ?? item.category).font(.caption).foregroundStyle(AppColors.muted) }; Spacer(); Text(item.type == "income" ? "+\(money(item.amount))" : money(item.amount)).foregroundStyle(item.type == "income" ? .green : AppColors.text) } }
                    Text("Reçus à vérifier sur le Mac : \(month.pendingReceipts)").foregroundStyle(AppColors.muted)
                    Text("Mis à jour \(relativeDate(month.updatedAt))").font(.caption).foregroundStyle(AppColors.muted)
                }.padding(24)
            } else { VStack(spacing: 14) { Image(systemName: "laptopcomputer").font(.system(size: 38)); Text("Ouvre MaVie sur ton Mac pour voir ton mois ici").font(.headline).multilineTextAlignment(.center) }.foregroundStyle(AppColors.muted).padding(48).frame(maxWidth: .infinity, maxHeight: .infinity) }
        }.refreshable { model.refreshResume() }.background(AppColors.background)
    }
    private func variation(_ current: Double, _ previous: Double?, lowerIsBetter: Bool) -> String? { guard let previous, previous != 0 else { return nil }; let delta = ((current - previous) / previous) * 100; return "\(delta >= 0 ? "+" : "")\(Int(delta.rounded())) %" }
}

struct Metric: View { let label: String; let value: String; let variation: String?; var body: some View { VStack(alignment: .leading, spacing: 3) { Text(value).font(.title3.bold()); Text(label).font(.caption).foregroundStyle(AppColors.muted); if let variation { Text(variation).font(.caption).foregroundStyle(AppColors.muted) } }.frame(maxWidth: .infinity, alignment: .leading) } }
struct SectionTitle: View { let text: String; var body: some View { Text(text).font(.headline).padding(.top, 4) } }

struct ExpenseFormView: View {
    @ObservedObject var model: MaVieModel
    @Environment(\.dismiss) private var dismiss
    @State private var amount = ""; @State private var description = ""; @State private var category = "Autres"; @State private var subcategory = ""; @State private var type = "expense"; @State private var date = Date(); @State private var person = ""; @State private var account = ""; @State private var note = ""
    var selectedCategory: Category? { model.categories.first { $0.name == category } }
    var body: some View {
        NavigationStack { Form {
            Section { TextField("0,00 $", text: $amount).keyboardType(.decimalPad).font(.system(size: 34, weight: .semibold, design: .serif)); TextField("Description", text: $description) }
            Section("Raccourcis") {
                ScrollView(.horizontal) {
                    HStack(spacing: 8) {
                        QuickChip("Essence", category: "Transport", sub: "Essence", description: $description, categoryValue: $category, subcategory: $subcategory)
                        QuickChip("Épicerie", category: "Alimentation", sub: nil, description: $description, categoryValue: $category, subcategory: $subcategory)
                        QuickChip("Restaurant", category: "Restaurants", sub: "Restaurant", description: $description, categoryValue: $category, subcategory: $subcategory)
                        QuickChip("Café", category: "Restaurants", sub: "Café", description: $description, categoryValue: $category, subcategory: $subcategory)
                        QuickChip("Stationnement", category: "Transport", sub: "Stationnement", description: $description, categoryValue: $category, subcategory: $subcategory)
                        QuickChip("Pharmacie", category: "Santé & Fitness", sub: "Pharmacie", description: $description, categoryValue: $category, subcategory: $subcategory)
                    }
                }
            }
            Section { Picker("Catégorie", selection: $category) { ForEach(model.categories.filter { $0.kind != "income" }) { Text($0.name).tag($0.name) } }; Picker("Sous-catégorie", selection: $subcategory) { Text("Aucune").tag(""); ForEach(selectedCategory?.subcategories ?? [], id: \.self) { Text($0).tag($0) } }.disabled(selectedCategory?.subcategories.isEmpty ?? true); Picker("Type", selection: $type) { Text("Dépense").tag("expense"); Text("Revenu").tag("income") } }
            Section { DatePicker("Date", selection: $date, displayedComponents: .date); Picker("Personne", selection: $person) { Text("Aucune").tag(""); ForEach(model.people, id: \.self) { Text($0).tag($0) } }; Picker("Compte", selection: $account) { Text("Aucun").tag(""); ForEach(model.accounts) { Text($0.name).tag($0.name) }; }; TextField("Note (facultatif)", text: $note) }
        }.navigationTitle("Sans reçu").toolbar { ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Ajouter") { model.addExpense(type: type, amountText: amount, description: description, category: category, subcategory: subcategory.isEmpty ? nil : subcategory, date: date, person: person, account: account, note: note); dismiss() }.disabled(Double(amount.replacingOccurrences(of: ",", with: ".")) == nil || description.isEmpty) } }.onAppear { if category == "Autres" { category = model.categories.first(where: { $0.kind != "income" })?.name ?? "Autres" }; person = model.people.first ?? ""; account = model.accounts.first?.name ?? "" } }
    }
}

struct QuickChip: View {
    let title: String; let cat: String; let sub: String?
    @Binding var description: String; @Binding var categoryValue: String; @Binding var subcategory: String
    init(_ title: String, category: String, sub: String?, description: Binding<String>, categoryValue: Binding<String>, subcategory: Binding<String>) { self.title = title; cat = category; self.sub = sub; _description = description; _categoryValue = categoryValue; _subcategory = subcategory }
    private var isSelected: Bool { categoryValue == cat && subcategory == (sub ?? "") }
    var body: some View {
        Button { description = title; categoryValue = cat; subcategory = sub ?? "" } label: {
            Text(title).font(.caption.weight(.semibold)).fixedSize(horizontal: true, vertical: false)
                .padding(.horizontal, 14).padding(.vertical, 8).frame(minHeight: 44)
                .foregroundStyle(isSelected ? .white : AppColors.text)
                .background(isSelected ? AppColors.red : AppColors.panel).clipShape(Capsule()).contentShape(Capsule())
        }.buttonStyle(.plain).accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

struct ReviewView: View {
    @ObservedObject var model: MaVieModel
    @State private var sent = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack { Button { model.screen = .home; model.images = [] } label: { Image(systemName: "chevron.left") }; Text("Vérifie ton reçu").font(.title.bold()); Spacer() }
                if let image = model.images.first { Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 300).clipShape(RoundedRectangle(cornerRadius: 14)) }
                Picker("Personne", selection: $model.person) { Text("Choisir").tag(""); ForEach(model.people, id: \.self) { Text($0).tag($0) } }.pickerStyle(.menu).padding().background(AppColors.panel).clipShape(RoundedRectangle(cornerRadius: 12))
                Picker("Compte", selection: $model.account) { Text("Choisir").tag(""); ForEach(model.accounts) { Text($0.name).tag($0.name) } }.pickerStyle(.menu).padding().background(AppColors.panel).clipShape(RoundedRectangle(cornerRadius: 12))
                TextField("Note (facultatif)", text: $model.note).textFieldStyle(.roundedBorder)
                Button("Envoyer au Mac") { model.send(); sent = true }.buttonStyle(PrimaryButtonStyle()).disabled(model.isSending)
            }.padding(24)
        }
        .alert("Envoyé !", isPresented: $sent) { Button("OK", role: .cancel) {} } message: { Text("Ton Mac va le lire") }
    }
}

struct HistoryView: View {
    @ObservedObject var model: MaVieModel
    @Environment(\.scenePhase) private var scenePhase
    private var shouldRefreshResults: Bool { scenePhase == .active && model.screen == .history && model.history.contains { $0.result == nil } }
    var body: some View {
        NavigationStack {
            List {
                ForEach(model.history) { item in
                    NavigationLink { SentReceiptDetailView(model: model, original: item) } label: { SentReceiptRow(item: item) }
                        .listRowBackground(AppColors.panel)
                }
            }.scrollContentBackground(.hidden).refreshable { model.refreshResults() }
            .navigationTitle("Historique")
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Accueil") { model.screen = .home } } }
        }
        .task(id: shouldRefreshResults) {
            guard shouldRefreshResults else { return }
            while !Task.isCancelled && shouldRefreshResults {
                model.refreshResults()
                guard shouldRefreshResults else { return }
                do { try await Task.sleep(for: .seconds(4)) } catch { return }
            }
        }
    }
}

private extension SentReceipt {
    var displayTitle: String {
        [result?.store, result?.description, sentDescription].compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }.first { !$0.isEmpty } ?? (kind == "expense" ? "Dépense" : "Reçu")
    }
    var displayAmount: Double? { result?.total ?? result?.amount ?? sentAmount }
    var hasError: Bool { result?.status?.lowercased() == "error" || result?.error != nil }
    var statusTitle: String { result == nil ? "En attente du Mac" : hasError ? "Erreur" : result?.status?.lowercased() == "added" ? "Ajoutée" : "Lu" }
    var statusTint: Color { result == nil ? AppColors.muted : hasError ? .red : .green }
    var fallbackIcon: String { kind == "expense" ? "creditcard" : "doc.text.image" }
}

private struct SentStatusBadge: View {
    let item: SentReceipt
    var body: some View {
        Text(item.statusTitle).font(.caption.weight(.semibold)).foregroundStyle(item.statusTint)
            .padding(.horizontal, 8).padding(.vertical, 4).background(item.statusTint.opacity(0.15)).clipShape(Capsule())
    }
}

private struct SentReceiptRow: View {
    let item: SentReceipt
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Group {
                if let image = SentMediaStore.thumbnail(id: item.id) { Image(uiImage: image).resizable().scaledToFill() }
                else { Image(systemName: item.fallbackIcon).font(.title2).foregroundStyle(AppColors.muted).frame(maxWidth: .infinity, maxHeight: .infinity).background(AppColors.background) }
            }.frame(width: 54, height: 68).clipShape(RoundedRectangle(cornerRadius: 8)).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 5) {
                Text(item.displayTitle).font(.headline).foregroundStyle(AppColors.text).lineLimit(2)
                Text(sentDate(item.sentAt)).font(.caption).foregroundStyle(AppColors.muted)
                if let amount = item.displayAmount { Text(money(amount)).font(.subheadline.weight(.semibold)).foregroundStyle(AppColors.text) }
                SentStatusBadge(item: item)
                if item.result == nil { Text("Mise à jour automatique").font(.caption2).foregroundStyle(AppColors.muted) }
            }
        }.padding(.vertical, 4)
    }
}

private struct SentReceiptDetailView: View {
    @ObservedObject var model: MaVieModel
    let original: SentReceipt
    private var item: SentReceipt { model.history.first { $0.id == original.id } ?? original }
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                Text(item.displayTitle).font(.title2.bold())
                Text(sentDate(item.sentAt)).font(.subheadline).foregroundStyle(AppColors.muted)
                SentStatusBadge(item: item)
                if item.hasError { Text(item.result?.error ?? "Le Mac n’a pas pu lire le reçu.").foregroundStyle(.red).textSelection(.enabled) }
                else if item.result == nil { Text("Le résultat apparaîtra automatiquement dès que le Mac aura traité cet envoi.").font(.subheadline).foregroundStyle(AppColors.muted) }
                VStack(alignment: .leading, spacing: 10) {
                    if let store = item.result?.store { detail("Magasin", store) }
                    if let description = item.result?.description ?? item.sentDescription { detail("Description", description) }
                    if let amount = item.displayAmount { detail("Total", money(amount)) }
                    if let count = item.result?.itemsCount { detail("Articles", String(count)) }
                    if let category = item.result?.category { detail("Catégorie", category) }
                    detail("Personne", item.person ?? "Non renseignée")
                    detail("Compte", item.accountName ?? "Non renseigné")
                    detail("Note", item.note ?? "Aucune")
                }.padding(14).frame(maxWidth: .infinity, alignment: .leading).background(AppColors.panel).clipShape(RoundedRectangle(cornerRadius: 12))
                if let count = item.pageCount, count > 0 {
                    ForEach(0..<count, id: \.self) { page in
                        SentReceiptPage(url: SentMediaStore.pageURL(id: item.id, page: page), page: page, count: count)
                    }
                } else {
                    VStack(spacing: 10) {
                        Image(systemName: item.fallbackIcon).font(.system(size: 40))
                        Text(item.kind == "expense" ? "Dépense sans reçu" : "Aucune copie locale pour cet envoi")
                    }.font(.subheadline).foregroundStyle(AppColors.muted).frame(maxWidth: .infinity).padding(.vertical, 28)
                }
            }.padding(20)
        }.background(AppColors.background).navigationTitle("Détail de l’envoi").navigationBarTitleDisplayMode(.inline)
    }
    private func detail(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) { Text(label).font(.caption).foregroundStyle(AppColors.muted); Text(value).font(.subheadline).textSelection(.enabled) }
    }
}

private struct SentReceiptPage: View {
    let url: URL
    let page: Int
    let count: Int
    @State private var image: UIImage?
    @GestureState private var magnification: CGFloat = 1
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if count > 1 { Text("Page \(page + 1) sur \(count)").font(.caption).foregroundStyle(AppColors.muted) }
            if let image {
                Image(uiImage: image).resizable().scaledToFit().scaleEffect(magnification)
                    .gesture(MagnifyGesture().updating($magnification) { value, scale, _ in scale = min(max(value.magnification, 1), 4) })
                    .clipped().accessibilityLabel("Photo du reçu, page \(page + 1)")
                Text("Pincez pour agrandir").font(.caption2).foregroundStyle(AppColors.muted)
            } else { Label("Copie locale indisponible", systemImage: "photo").foregroundStyle(AppColors.muted) }
        }.task(id: url) { image = UIImage(contentsOfFile: url.path) }
    }
}

private func sentDate(_ date: Date) -> String {
    let calendar = Calendar.current
    let formatter = DateFormatter(); formatter.locale = Locale(identifier: "fr_CA"); formatter.dateFormat = "H 'h' mm"
    let time = formatter.string(from: date)
    if calendar.isDateInToday(date) { return "Aujourd’hui \(time)" }
    if calendar.isDateInYesterday(date) { return "Hier \(time)" }
    formatter.dateFormat = calendar.component(.year, from: date) == calendar.component(.year, from: Date()) ? "d MMM" : "d MMM yyyy"
    return "\(formatter.string(from: date)) \(time)"
}

private func money(_ value: Double) -> String { let formatter = NumberFormatter(); formatter.locale = Locale(identifier: "fr_CA"); formatter.numberStyle = .currency; formatter.currencySymbol = "$"; return formatter.string(from: NSNumber(value: value)) ?? "\(value) $" }
private func relativeDate(_ date: Date) -> String { let minutes = max(0, Int(Date().timeIntervalSince(date) / 60)); return minutes < 1 ? "à l'instant" : "il y a \(minutes) min" }

extension Color {
    init(hex: String) { let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0; self.init(red: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255) }
}

struct SettingsView: View {
    @ObservedObject var model: MaVieModel
    @State private var picker = false
    var body: some View {
        NavigationStack {
            Form {
                Section("Dossier iCloud") { Text(model.folder.folderURL?.path ?? "Aucun dossier choisi").font(.caption).foregroundStyle(AppColors.muted); Button("Changer de dossier") { picker = true } }
                Section("Données") { Button("Vider l'historique", role: .destructive) { UserDefaults.standard.removeObject(forKey: "history"); model.clearHistory() } }
                Section("À propos") { Text("MaVie 1.0.0"); Text("Ton Mac lit les reçus déposés dans MaVie/A-traiter.").font(.caption).foregroundStyle(AppColors.muted) }
            }.scrollContentBackground(.hidden).background(AppColors.background).navigationTitle("Réglages").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .topBarLeading) { Button { model.screen = .home } label: { Label("Retour", systemImage: "chevron.left").labelStyle(.titleAndIcon) } } }
                .toolbarBackground(AppColors.background, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
                .background(DocumentPickerPresenter(store: model.folder, isPresented: $picker).frame(width: 0, height: 0))
        }
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View { configuration.label.foregroundStyle(.white).frame(maxWidth: .infinity).padding().background(AppColors.red.opacity(configuration.isPressed ? 0.75 : 1)).clipShape(RoundedRectangle(cornerRadius: 14)) }
}
struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View { configuration.label.foregroundStyle(AppColors.text).padding().frame(maxWidth: .infinity).background(AppColors.panel).clipShape(RoundedRectangle(cornerRadius: 12)) }
}
