import SwiftUI
import PhotosUI

struct RootView: View {
    @ObservedObject var model: MaVieModel
    var body: some View {
        ZStack {
            AppColors.ledger.ignoresSafeArea()
            Group {
                if !model.isConfigured { WelcomeView(model: model) }
                else {
                    switch model.screen {
                    case .review: ReviewView(model: model)
                    case .settings: SettingsView(model: model)
                    case .addExpense: ExpenseFormView(model: model)
                    default:
                        TabView(selection: $model.screen) {
                            MonthView(model: model).tabItem { Label("Mon mois", systemImage: "calendar") }.tag(MaVieModel.AppScreen.month)
                            HomeView(model: model).tabItem { Label("Ajouter", systemImage: "plus.circle") }.tag(MaVieModel.AppScreen.home)
                            HistoryView(model: model).tabItem { Label("Envois", systemImage: "paperplane") }.tag(MaVieModel.AppScreen.history)
                        }
                        .toolbarBackground(AppColors.ledger, for: .tabBar).toolbarBackground(.visible, for: .tabBar)
                    }
                }
            }.disabled(model.showingSentConfirmation).accessibilityHidden(model.showingSentConfirmation)
            if model.showingSentConfirmation {
                SentConfirmation(queued: model.lastSendWasQueued) {
                    model.showingSentConfirmation = false
                    model.images = []
                    model.note = ""
                    model.screen = .home
                }.zIndex(1)
            }
        }.tint(AppColors.stamp).foregroundStyle(AppColors.ink)
            .environment(\.locale, Locale(identifier: "fr_CA"))
    }
}

// Première connexion : deux appareils réels et le dossier partagé, sans fausses données.
struct WelcomeView: View {
    @ObservedObject var model: MaVieModel
    @State private var picker = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                HStack(spacing: 16) {
                    Image("Logo").resizable().scaledToFit().frame(width: 64, height: 64).accessibilityHidden(true)
                    Text("MaVie").font(.largeTitle.weight(.bold))
                }.padding(.top, 20)
                VStack(alignment: .leading, spacing: 12) {
                    Text("Tes achats,\ntoujours avec toi.").font(.largeTitle.weight(.semibold)).fixedSize(horizontal: false, vertical: true)
                    Text("Prends tes reçus en photo sur ton iPhone. Retrouve-les sur ton Mac et garde un œil sur ton mois.").foregroundStyle(AppColors.ink2)
                }
                VStack(alignment: .leading, spacing: 24) {
                    SetupStep(icon: "laptopcomputer", title: "Ouvre MaVie sur ton Mac", detail: "Le Mac prépare le dossier partagé lors de la première ouverture.")
                    SetupStep(icon: "folder.badge.plus", title: "Relie ton iPhone", detail: "Choisis iCloud Drive, puis le dossier MaVie. Utilise le même compte iCloud sur les deux appareils.")
                    SetupStep(icon: "doc.viewfinder", title: "Scanne ton premier reçu", detail: "Le Mac lit les articles. Tu les vérifies avant de les ajouter au budget.")
                }.ledgerCard(padding: 20)
                ReceiptStrip {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "iphone").font(.title2).accessibilityHidden(true)
                        Text("Un reçu sur ton iPhone.\nUn achat de moins à oublier.")
                    }
                }
                Button { picker = true } label: { Label("Choisir le dossier MaVie", systemImage: "folder") }.buttonStyle(PrimaryButtonStyle())
            }.padding(24)
        }.background(AppColors.ledger)
            .background(DocumentPickerPresenter(store: model.folder, isPresented: $picker).frame(width: 0, height: 0))
    }
}

private struct SetupStep: View {
    let icon: String
    let title: String
    let detail: String
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon).font(.title2.weight(.light)).foregroundStyle(AppColors.ink2).frame(width: 32).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 6) {
                Text(title).font(.headline)
                Text(detail).font(.subheadline).foregroundStyle(AppColors.ink3).fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

struct HomeView: View {
    @ObservedObject var model: MaVieModel
    @Environment(\.scenePhase) private var scenePhase
    @State private var camera = false
    @State private var capturedImages: [UIImage] = []
    @State private var photoItem: PhotosPickerItem?
    @State private var importing = false
    @State private var importError = false
    @State private var expenseForm = false
    private var greeting: String {
        switch Calendar.current.component(.hour, from: Date()) {
        case 5..<12: return "Bon matin"
        case 12..<18: return "Bon après-midi"
        default: return "Bonsoir"
        }
    }
    private var household: String {
        guard let name = model.config.householdName, !name.isEmpty else { return "Ton foyer" }
        return name
    }
    private var shouldRefresh: Bool { scenePhase == .active && model.screen == .home && model.history.prefix(3).contains { $0.isAwaitingResult } }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    HStack(alignment: .top, spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(greeting).font(.largeTitle.weight(.semibold))
                            Text(household).font(.body).foregroundStyle(AppColors.ink2)
                        }
                        Spacer(minLength: 8)
                        Image("Logo").resizable().scaledToFit().frame(width: 44, height: 44).accessibilityHidden(true)
                    }
                    if let month = model.resume {
                        Button { model.screen = .month } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack { Text(month.monthLabel.capitalized).font(.subheadline); Spacer(); Image(systemName: "chevron.right").font(.caption) }.foregroundStyle(AppColors.ink3)
                                Text(month.balanceTitle).font(.subheadline).foregroundStyle(AppColors.ink2)
                                Text(money(month.balanceAmount))
                                    .font(.system(.largeTitle, design: .serif, weight: .semibold)).monospacedDigit().foregroundStyle(AppColors.ink)
                                    .lineLimit(1).minimumScaleFactor(0.6)
                            }.ledgerCard()
                        }.buttonStyle(PressButtonStyle()).accessibilityHint("Ouvre le détail de ton mois")
                    }
                    captureActions
                    latestSends
                }.padding(20)
            }.background(AppColors.ledger).refreshable { model.retryQueueAndRefresh() }
                .navigationTitle("Ajouter").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { model.screen = .settings } label: { Image(systemName: "gearshape").frame(width: 44, height: 44) }.accessibilityLabel("Réglages")
                    }
                }
                .toolbarBackground(AppColors.ledger, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
        }
        .sheet(isPresented: $camera, onDismiss: {
            if !capturedImages.isEmpty { model.setImages(capturedImages); capturedImages = [] }
        }) {
            CameraView(onImages: { images in capturedImages = images; camera = false }, onCancel: { camera = false }).ignoresSafeArea()
        }
        .sheet(isPresented: $expenseForm) { ExpenseFormView(model: model) }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            importing = true
            Task { @MainActor in
                defer { importing = false; photoItem = nil }
                do {
                    guard let data = try await item.loadTransferable(type: Data.self), let image = UIImage(data: data) else { importError = true; return }
                    model.setImages([image])
                } catch { importError = true }
            }
        }
        .alert("La photo n’a pas pu être importée", isPresented: $importError) {
            Button("OK", role: .cancel) {}
        } message: { Text("Essaie une autre photo ou scanne le reçu avec la caméra.") }
        .task(id: shouldRefresh) {
            guard shouldRefresh else { return }
            while !Task.isCancelled && shouldRefresh {
                model.refreshResults()
                guard shouldRefresh else { return }
                do { try await Task.sleep(for: .seconds(4)) } catch { return }
            }
        }
    }
    private var captureActions: some View {
        VStack(spacing: 12) {
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                camera = true
            } label: {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(alignment: .center, spacing: 20) {
                        Image(systemName: "doc.viewfinder").font(.system(size: 48, weight: .light)).foregroundStyle(AppColors.ink).accessibilityHidden(true)
                        Text("Garde le reçu au complet. Ton Mac s’occupe de le lire.").font(.subheadline).foregroundStyle(AppColors.ink2).fixedSize(horizontal: false, vertical: true)
                    }.padding(.horizontal, 20).padding(.top, 24)
                    Label("Scanner un reçu", systemImage: "camera").font(.headline).frame(maxWidth: .infinity, minHeight: 54)
                        .foregroundStyle(AppColors.stampInk).background(AppColors.stamp)
                }.background(AppColors.sheet2).clipShape(RoundedRectangle(cornerRadius: Theme.panelRadius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.panelRadius).strokeBorder(AppColors.ruleStrong, lineWidth: 1))
            }.buttonStyle(PressButtonStyle()).accessibilityLabel("Scanner un reçu").accessibilityHint("Ouvre la caméra pour photographier une ou plusieurs pages")
            PhotosPicker(selection: $photoItem, matching: .images) {
                HStack { if importing { ProgressView() }; Label(importing ? "Importation…" : "Importer une photo", systemImage: "photo") }
            }.buttonStyle(SecondaryButtonStyle()).disabled(importing)
            Button { expenseForm = true } label: { Label("Ajouter sans reçu", systemImage: "square.and.pencil") }.buttonStyle(SecondaryButtonStyle())
        }.disabled(importing)
    }
    private var allSendsButton: some View {
        Button("Tout voir") { model.refreshResults(); model.screen = .history }
            .font(.subheadline).frame(minHeight: 44).accessibilityLabel("Voir tous les envois")
    }
    private var latestSends: some View {
        VStack(alignment: .leading, spacing: 12) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline) { SectionTitle(text: "Derniers envois"); Spacer(minLength: 8); allSendsButton }
                VStack(alignment: .leading, spacing: 4) { SectionTitle(text: "Derniers envois"); allSendsButton }
            }
            if model.history.isEmpty {
                Label("Ton premier reçu apparaîtra ici. Tu pourras suivre sa lecture par le Mac.", systemImage: "tray")
                    .font(.subheadline).foregroundStyle(AppColors.ink2).ledgerCard()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(model.history.prefix(3).enumerated()), id: \.element.id) { index, item in
                        if index > 0 { Divider().overlay(AppColors.rule) }
                        NavigationLink { SentReceiptDetailView(model: model, original: item) } label: { SentReceiptRow(item: item) }.buttonStyle(PressButtonStyle())
                    }
                }.ledgerCard(padding: 12)
            }
        }
    }
}

struct ReviewView: View {
    @ObservedObject var model: MaVieModel
    @State private var showingPhoto = false
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tout est lisible ?").font(.title2.weight(.semibold))
                        Text("Vérifie que le magasin, les articles et le total sont dans la photo.").font(.subheadline).foregroundStyle(AppColors.ink2)
                    }
                    if let image = model.images.first {
                        Button { showingPhoto = true } label: {
                            Image(uiImage: image).resizable().scaledToFit().frame(maxWidth: .infinity).frame(maxHeight: 440)
                                .clipShape(RoundedRectangle(cornerRadius: Theme.panelRadius))
                                .padding(12).frame(maxWidth: .infinity).background(AppColors.well, in: RoundedRectangle(cornerRadius: Theme.dialogRadius))
                        }.buttonStyle(PressButtonStyle()).accessibilityLabel("Voir le reçu en plein écran")
                        Label(model.images.count > 1 ? "\(model.images.count) pages · Touche pour vérifier chaque page" : "Touche la photo pour l’agrandir", systemImage: "arrow.up.left.and.arrow.down.right")
                            .font(.caption).foregroundStyle(AppColors.ink3)
                    }
                    PaymentFields(people: model.people, accounts: model.accounts, person: $model.person, account: $model.account).ledgerCard()
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Une note pour plus tard").font(.headline)
                        TextField("Facultatif", text: $model.note, axis: .vertical).lineLimit(2...5).ledgerField()
                    }.ledgerCard()
                    if let error = model.sendError {
                        Label(error, systemImage: "exclamationmark.circle").font(.subheadline).foregroundStyle(AppColors.warn)
                    }
                    Label("Tu vérifieras les articles lus sur ton Mac avant de les ajouter au budget.", systemImage: "laptopcomputer")
                        .font(.subheadline).foregroundStyle(AppColors.ink3)
                }.padding(20)
            }.scrollDismissesKeyboard(.interactively).background(AppColors.ledger)
                .navigationTitle("Vérifie ton reçu").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button { model.screen = .home; model.images = [] } label: { Label("Retour", systemImage: "chevron.left") }.frame(minHeight: 44)
                    }
                }
                .toolbarBackground(AppColors.ledger, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
                .safeAreaInset(edge: .bottom) {
                    Button { Task { await model.send() } } label: {
                        HStack(spacing: 10) {
                            if model.isSending { ProgressView().tint(.white) }
                            else { Image(systemName: "paperplane") }
                            Text(model.isSending ? "Envoi en cours…" : "Envoyer au Mac")
                        }
                    }.buttonStyle(PrimaryButtonStyle()).disabled(model.images.isEmpty || model.isSending)
                        .padding(16).background(AppColors.ledger)
                }.disabled(model.isSending || model.showingSentConfirmation)
        }
        .onAppear { model.refreshConfig() }
        .fullScreenCover(isPresented: $showingPhoto) {
            NavigationStack {
                TabView {
                    ForEach(model.images.indices, id: \.self) { index in
                        Image(uiImage: model.images[index]).resizable().scaledToFit().padding(.bottom, 40)
                            .accessibilityLabel("Page \(index + 1) sur \(model.images.count)")
                    }
                }.tabViewStyle(.page(indexDisplayMode: model.images.count > 1 ? .always : .never)).background(AppColors.ledger)
                    .navigationTitle(model.images.count > 1 ? "\(model.images.count) pages" : "Reçu").navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Fermer") { showingPhoto = false }.frame(minHeight: 44) } }
                    .toolbarBackground(AppColors.ledger, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
            }.preferredColorScheme(.dark)
        }
    }
}

private struct SentConfirmation: View {
    let queued: Bool
    let finish: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var stamped = false
    var body: some View {
        ZStack {
            AppColors.ledger.opacity(0.96).ignoresSafeArea()
            ScrollView {
                VStack(spacing: 24) {
                    ReceiptStrip {
                        VStack(alignment: .leading, spacing: 20) {
                            Text("MaVie").fontWeight(.bold)
                            Stamp(text: queued ? "CONSERVÉ" : "ENVOYÉ")
                                .scaleEffect(reduceMotion || stamped ? 1 : 0.95).opacity(stamped ? 1 : 0)
                            Text(queued ? "Ton reçu reste sur cet iPhone. MaVie réessaiera l’envoi au prochain retour dans l’app." : "Ton reçu est prêt pour ton Mac. Suis sa lecture dans Envois.")
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    Button("Retour à l’accueil", action: finish).buttonStyle(SecondaryButtonStyle())
                }.padding(28)
            }.scrollBounceBehavior(.basedOnSize)
        }.accessibilityAddTraits(.isModal)
            .task {
                withAnimation(reduceMotion ? nil : Theme.motion) { stamped = true }
                // VoiceOver et une mise en attente demandent le temps de lire le message.
                guard !UIAccessibility.isVoiceOverRunning && !queued else { return }
                do { try await Task.sleep(for: .milliseconds(1400)) } catch { return }
                finish()
            }
    }
}

struct SettingsView: View {
    @ObservedObject var model: MaVieModel
    @State private var picker = false
    @State private var confirmClear = false
    private var version: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0" }
    private var build: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1" }
    private var folderName: String { model.folder.folderURL?.lastPathComponent ?? "MaVie" }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 16) {
                        Image("Logo").resizable().scaledToFit().frame(width: 52, height: 52).accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 5) {
                            Text(model.config.householdName ?? "MaVie").font(.title2.weight(.semibold))
                            Text("Ton iPhone et ton Mac, reliés.").font(.subheadline).foregroundStyle(AppColors.ink3)
                        }
                    }.padding(.vertical, 8)
                    VStack(alignment: .leading, spacing: 16) {
                        SectionTitle(text: "Dossier partagé")
                        Label("iCloud Drive › \(folderName)", systemImage: "folder").font(.body.weight(.medium))
                            .textSelection(.enabled).fixedSize(horizontal: false, vertical: true)
                        Text("Choisis le même dossier MaVie que sur ton Mac pour y retrouver tes envois.").font(.subheadline).foregroundStyle(AppColors.ink2)
                        Button("Changer de dossier") { picker = true }.buttonStyle(SecondaryButtonStyle())
                    }.ledgerCard()
                    VStack(alignment: .leading, spacing: 16) {
                        SectionTitle(text: "Sur cet iPhone")
                        ValueRow(label: "Envois conservés", value: "\(model.history.count) / 30")
                        Text("Vider l’historique efface les copies locales des photos. Les fichiers iCloud et les données du Mac restent en place.")
                            .font(.subheadline).foregroundStyle(AppColors.ink2)
                        Button(role: .destructive) { confirmClear = true } label: { Label("Vider l’historique", systemImage: "trash").frame(minHeight: 44) }
                            .disabled(model.history.isEmpty)
                    }.ledgerCard()
                    VStack(alignment: .leading, spacing: 16) {
                        SectionTitle(text: "À propos")
                        ValueRow(label: "MaVie pour iPhone", value: "\(version) (\(build))")
                        Text("Ton iPhone garde les reçus. Ton Mac lit les articles et prépare ton budget. Tu gardes le dernier mot sur chaque achat.")
                            .font(.subheadline).foregroundStyle(AppColors.ink2)
                    }.ledgerCard()
                }.padding(20)
            }.background(AppColors.ledger).navigationTitle("Réglages").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button { model.screen = .home } label: { Label("Retour", systemImage: "chevron.left").labelStyle(.titleAndIcon) }.frame(minHeight: 44)
                    }
                }
                .toolbarBackground(AppColors.ledger, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
                .background(DocumentPickerPresenter(store: model.folder, isPresented: $picker).frame(width: 0, height: 0))
                .confirmationDialog("Vider l’historique de cet iPhone ?", isPresented: $confirmClear, titleVisibility: .visible) {
                    Button("Vider l’historique", role: .destructive) { model.clearHistory(); UINotificationFeedbackGenerator().notificationOccurred(.success) }
                    Button("Annuler", role: .cancel) {}
                } message: { Text("Les copies locales des reçus seront effacées. Tes données sur le Mac et dans iCloud seront conservées.") }
        }
    }
}
