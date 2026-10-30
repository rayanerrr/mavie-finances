import SwiftUI

@main
struct MaVieApp: App {
    @StateObject private var model = MaVieModel()

    var body: some Scene {
        WindowGroup {
            RootView(model: model)
                .preferredColorScheme(.dark)
        }
    }
}
