import SwiftUI

struct HistoryView: View {
    @ObservedObject var model: MaVieModel
    @Environment(\.scenePhase) private var scenePhase
    private var shouldRefreshResults: Bool {
        scenePhase == .active && model.screen == .history && model.history.contains { $0.isAwaitingResult }
    }
    private var days: [Date] { Array(Set(model.history.map { Calendar.current.startOfDay(for: $0.sentAt) })).sorted(by: >) }
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 24) {
                    if model.history.isEmpty {
                        EmptyLedger(icon: "tray", title: "Ton premier envoi t’attend", message: "Scanne un reçu ou ajoute un achat sans reçu. Tu pourras suivre sa lecture ici.")
                        Button("Ajouter un achat") { model.screen = .home }.buttonStyle(PrimaryButtonStyle())
                    } else {
                        Text("\(model.history.count) envoi\(model.history.count > 1 ? "s" : "") conservé\(model.history.count > 1 ? "s" : "") sur cet iPhone")
                            .font(.subheadline).foregroundStyle(AppColors.ink3)
                        ForEach(days, id: \.self) { day in
                            VStack(alignment: .leading, spacing: 12) {
                                SectionTitle(text: dayTitle(day))
                                VStack(spacing: 0) {
                                    let entries = model.history.filter { Calendar.current.isDate($0.sentAt, inSameDayAs: day) }.sorted { $0.sentAt > $1.sentAt }
                                    ForEach(Array(entries.enumerated()), id: \.element.id) { index, item in
                                        if index > 0 { Divider().overlay(AppColors.rule) }
                                        NavigationLink { SentReceiptDetailView(model: model, original: item) } label: { SentReceiptRow(item: item) }
                                            .buttonStyle(PressButtonStyle())
                                    }
                                }.ledgerCard(padding: 12)
                            }
                        }
                        Text("Les 30 derniers envois restent ici. Tes dépenses confirmées sont conservées sur ton Mac.")
                            .font(.caption).foregroundStyle(AppColors.ink3)
                    }
                }.padding(20)
            }.background(AppColors.ledger).refreshable { model.retryQueueAndRefresh() }
                .navigationTitle("Envois").navigationBarTitleDisplayMode(.inline)
                .toolbarBackground(AppColors.ledger, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
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

extension SentReceipt {
    var displayTitle: String {
        [result?.store, result?.description, sentDescription].compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty } ?? (kind == "expense" ? "Dépense sans reçu" : "Reçu envoyé")
    }
    var displayAmount: Double? { result?.total ?? result?.amount ?? sentAmount }
    var hasError: Bool { result?.status?.lowercased() == "error" || !(result?.error?.isEmpty ?? true) }
    var isAdded: Bool { ["added", "confirmed"].contains(result?.status?.lowercased() ?? "") }
    var isAwaitingResult: Bool { !hasError && (result == nil || ["pending", "analyzing"].contains(result?.status?.lowercased() ?? "")) }
    var statusTitle: String { hasError ? "À revoir sur le Mac" : isAwaitingResult ? "En attente du Mac" : isAdded ? "Ajouté au budget" : "Lu par le Mac" }
    var statusIcon: String { hasError ? "exclamationmark.circle" : isAwaitingResult ? "clock" : isAdded ? "checkmark.circle" : "doc.text.magnifyingglass" }
    var statusTint: Color { hasError ? AppColors.warn : isAwaitingResult ? AppColors.ink3 : AppColors.ok }
    var stampTitle: String { hasError ? "ERREUR" : isAwaitingResult ? "EN ATTENTE" : isAdded ? "AJOUTÉ" : "LU" }
    var fallbackIcon: String { kind == "expense" ? "creditcard" : "doc.text.image" }
}

struct SentStatusBadge: View {
    let item: SentReceipt
    var body: some View {
        Label(item.statusTitle, systemImage: item.statusIcon).font(.caption.weight(.medium)).foregroundStyle(item.statusTint)
            .fixedSize(horizontal: false, vertical: true)
    }
}

struct SentReceiptRow: View {
    let item: SentReceipt
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if !typeSize.isAccessibilitySize {
                Group {
                    if let image = SentMediaStore.thumbnail(id: item.id) { Image(uiImage: image).resizable().scaledToFill() }
                    else { Image(systemName: item.fallbackIcon).font(.title2).foregroundStyle(AppColors.ink3).frame(maxWidth: .infinity, maxHeight: .infinity).background(AppColors.well) }
                }.frame(width: 54, height: 72).clipShape(RoundedRectangle(cornerRadius: Theme.controlRadius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.controlRadius).strokeBorder(AppColors.ruleStrong, lineWidth: 1)).accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(item.displayTitle).font(.body.weight(.semibold)).foregroundStyle(AppColors.ink).fixedSize(horizontal: false, vertical: true)
                if let amount = item.displayAmount { Text(money(amount)).font(.subheadline.weight(.semibold)).monospacedDigit().foregroundStyle(AppColors.ink) }
                Text(sentDate(item.sentAt)).font(.caption).foregroundStyle(AppColors.ink3)
                SentStatusBadge(item: item)
            }.frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(AppColors.ink4).padding(.top, 5).accessibilityHidden(true)
        }.padding(.vertical, 12).frame(minHeight: 44).contentShape(Rectangle()).accessibilityElement(children: .combine)
    }
}

struct SentReceiptDetailView: View {
    @ObservedObject var model: MaVieModel
    let original: SentReceipt
    @Environment(\.scenePhase) private var scenePhase
    private var item: SentReceipt { model.history.first { $0.id == original.id } ?? original }
    private var shouldRefresh: Bool { scenePhase == .active && item.isAwaitingResult }
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 24) {
                if let count = item.pageCount, count > 0 {
                    ForEach(0..<count, id: \.self) { page in
                        SentReceiptPage(url: SentMediaStore.pageURL(id: item.id, page: page), page: page, count: count)
                    }
                } else if item.kind != "expense" {
                    Label("Aucune copie locale pour cet envoi", systemImage: "photo").font(.subheadline).foregroundStyle(AppColors.ink3).ledgerCard()
                }
                receiptSummary
                if item.hasError {
                    VStack(alignment: .leading, spacing: 10) {
                        Label("La lecture a besoin de toi", systemImage: "exclamationmark.circle").font(.headline).foregroundStyle(AppColors.warn)
                        Text(item.result?.error ?? "Le Mac n’a pas pu lire le reçu.").textSelection(.enabled)
                        Text("Ouvre ce reçu sur ton Mac pour le corriger ou relancer sa lecture.").foregroundStyle(AppColors.ink2)
                    }.font(.subheadline).ledgerCard()
                } else if item.isAwaitingResult {
                    Label("Ouvre MaVie sur ton Mac. Le résultat s’affichera ici automatiquement après la lecture.", systemImage: "laptopcomputer")
                        .font(.subheadline).foregroundStyle(AppColors.ink2).ledgerCard()
                } else if !item.isAdded {
                    Label("Vérifie les articles sur ton Mac pour les ajouter à ton budget.", systemImage: "checklist")
                        .font(.subheadline).foregroundStyle(AppColors.ink2).ledgerCard()
                }
                VStack(alignment: .leading, spacing: 16) {
                    SectionTitle(text: "Au moment de l’envoi")
                    ValueRow(label: "Personne", value: item.person ?? "Non précisée")
                    ValueRow(label: "Compte", value: item.accountName ?? "Non précisé")
                    if let note = item.note, !note.isEmpty {
                        Text("Ta note").font(.subheadline).foregroundStyle(AppColors.ink3)
                        Text(note).textSelection(.enabled)
                    }
                }.ledgerCard()
            }.padding(20)
        }.background(AppColors.ledger).navigationTitle("Détail de l’envoi").navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppColors.ledger, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
            .refreshable { model.refreshResults() }
            .task(id: shouldRefresh) {
                guard shouldRefresh else { return }
                while !Task.isCancelled && shouldRefresh {
                    model.refreshResults()
                    guard shouldRefresh else { return }
                    do { try await Task.sleep(for: .seconds(4)) } catch { return }
                }
            }
    }
    private var receiptSummary: some View {
        ReceiptStrip {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top) {
                    Text("MaVie").fontWeight(.bold)
                    Spacer(minLength: 12)
                    Stamp(text: item.stampTitle)
                }
                Text(item.displayTitle).font(.system(.title2, design: .monospaced, weight: .bold)).textSelection(.enabled)
                Text("Envoyé \(sentDate(item.sentAt))").font(.system(.caption, design: .monospaced))
                Rectangle().fill(AppColors.paperInk.opacity(0.2)).frame(height: 1)
                if let store = item.result?.store, !store.isEmpty { paperRow("Magasin", store) }
                if let description = item.result?.description ?? item.sentDescription { paperRow("Description", description) }
                if let count = item.result?.itemsCount { paperRow("Articles lus", "\(count)") }
                if let category = item.result?.category { paperRow("Catégorie", category) }
                paperRow("Statut", item.statusTitle)
                Rectangle().fill(AppColors.paperInk.opacity(0.2)).frame(height: 1)
                if let amount = item.displayAmount {
                    Text("Total").fontWeight(.medium)
                    HeroAmount(value: amount)
                } else {
                    Text("Le total apparaîtra après la lecture.")
                }
                Text(item.kind == "expense" ? "Achat saisi sans reçu" : "Résumé de la lecture du Mac").font(.system(.caption, design: .monospaced))
            }
        }
    }
    private func paperRow(_ label: String, _ value: String) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .firstTextBaseline) { Text(label); Spacer(minLength: 16); Text(value).fontWeight(.semibold) }
            VStack(alignment: .leading, spacing: 4) { Text(label); Text(value).fontWeight(.semibold) }
        }.accessibilityElement(children: .combine)
    }
}

private struct SentReceiptPage: View {
    let url: URL
    let page: Int
    let count: Int
    @State private var image: UIImage?
    @GestureState private var magnification: CGFloat = 1
    @State private var expanded = false
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if count > 1 { Text("Page \(page + 1) sur \(count)").font(.caption).foregroundStyle(AppColors.ink3) }
            if let image {
                Button { expanded = true } label: {
                    Image(uiImage: image).resizable().scaledToFit().frame(maxWidth: .infinity)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.panelRadius))
                }.buttonStyle(PressButtonStyle()).accessibilityLabel("Agrandir la photo du reçu, page \(page + 1)")
                Text("Touche la photo pour l’agrandir.").font(.caption).foregroundStyle(AppColors.ink3)
            } else { Label("Copie locale indisponible", systemImage: "photo").foregroundStyle(AppColors.ink3) }
        }.task(id: url) { image = UIImage(contentsOfFile: url.path) }
            .fullScreenCover(isPresented: $expanded) {
                NavigationStack {
                    Group {
                        if let image {
                            Image(uiImage: image).resizable().scaledToFit().scaleEffect(magnification)
                                .gesture(MagnifyGesture().updating($magnification) { value, scale, _ in scale = min(max(value.magnification, 1), 4) })
                                .clipped().accessibilityLabel("Photo du reçu, page \(page + 1)")
                        }
                    }.frame(maxWidth: .infinity, maxHeight: .infinity).background(AppColors.ledger)
                        .navigationTitle("Page \(page + 1) sur \(count)").navigationBarTitleDisplayMode(.inline)
                        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Fermer") { expanded = false }.frame(minHeight: 44) } }
                }
            }
    }
}

private func dayTitle(_ date: Date) -> String {
    if Calendar.current.isDateInToday(date) { return "Aujourd’hui" }
    if Calendar.current.isDateInYesterday(date) { return "Hier" }
    return date.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "fr_CA")))
}

func sentDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "fr_CA")
    formatter.dateFormat = "H 'h' mm"
    let time = formatter.string(from: date)
    if Calendar.current.isDateInToday(date) { return "aujourd’hui à \(time)" }
    if Calendar.current.isDateInYesterday(date) { return "hier à \(time)" }
    formatter.dateFormat = Calendar.current.component(.year, from: date) == Calendar.current.component(.year, from: Date()) ? "d MMM" : "d MMM yyyy"
    return "le \(formatter.string(from: date)) à \(time)"
}
