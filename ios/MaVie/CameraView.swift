import SwiftUI
import VisionKit
import UIKit

struct CameraView: UIViewControllerRepresentable {
    let onImages: ([UIImage]) -> Void
    let onCancel: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIViewController(context: Context) -> UIViewController {
        if VNDocumentCameraViewController.isSupported { let camera = VNDocumentCameraViewController(); camera.delegate = context.coordinator; return camera }
        let picker = UIImagePickerController(); picker.sourceType = .camera; picker.delegate = context.coordinator; return picker
    }
    func updateUIViewController(_ controller: UIViewController, context: Context) {}

    final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraView
        init(_ parent: CameraView) { self.parent = parent }
        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) { parent.onImages((0..<scan.pageCount).compactMap { scan.imageOfPage(at: $0) }) }
        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) { parent.onCancel() }
        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) { parent.onCancel() }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.onCancel() }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) { if let image = info[.originalImage] as? UIImage { parent.onImages([image]) } else { parent.onCancel() } }
    }
}

struct DocumentPickerPresenter: UIViewControllerRepresentable {
    @ObservedObject var store: FolderStore
    @Binding var isPresented: Bool
    func makeUIViewController(context: Context) -> Presenter { Presenter(store: store, isPresented: $isPresented) }
    func updateUIViewController(_ controller: Presenter, context: Context) { controller.update(isPresented: $isPresented) }
    final class Presenter: UIViewController {
        let store: FolderStore
        var isPresented: Binding<Bool>
        private var didPresent = false
        init(store: FolderStore, isPresented: Binding<Bool>) { self.store = store; self.isPresented = isPresented; super.init(nibName: nil, bundle: nil) }
        required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
        override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); presentPickerIfNeeded() }
        override func viewDidDisappear(_ animated: Bool) { super.viewDidDisappear(animated); didPresent = false }
        func presentPickerIfNeeded() {
            guard isPresented.wrappedValue, !didPresent, presentedViewController == nil else { return }
            didPresent = true
            store.chooseFolder(from: self) { [weak self] _ in self?.isPresented.wrappedValue = false }
        }
        func update(isPresented: Binding<Bool>) {
            self.isPresented = isPresented
            if isPresented.wrappedValue { presentPickerIfNeeded() }
        }
    }
}
