import SwiftUI

@main
struct MaVieApp: App {
    @StateObject private var model = MaVieModel()
    @AppStorage("appearance") private var appearance = AppearanceMode.system.rawValue

    var body: some Scene {
        WindowGroup {
            RootView(model: model)
                .preferredColorScheme(AppearanceMode(rawValue: appearance)?.colorScheme)
        }
    }
}
