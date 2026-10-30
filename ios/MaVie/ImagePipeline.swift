import UIKit

enum ImagePipeline {
    static func jpegData(from images: [UIImage]) -> Data? {
        guard let image = images.first else { return nil }
        return resized(image).jpegData(compressionQuality: 0.85)
    }

    static func pdfData(from images: [UIImage]) -> Data? {
        guard !images.isEmpty else { return nil }
        let format = UIGraphicsPDFRendererFormat()
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: 612, height: 792), format: format)
        return renderer.pdfData { context in
            for image in images {
                context.beginPage()
                let page = CGRect(x: 24, y: 24, width: 564, height: 744)
                let scale = min(page.width / image.size.width, page.height / image.size.height)
                let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
                image.draw(in: CGRect(x: page.midX - size.width / 2, y: page.midY - size.height / 2, width: size.width, height: size.height))
            }
        }
    }

    private static func resized(_ image: UIImage) -> UIImage {
        let maxSide: CGFloat = 2400
        guard max(image.size.width, image.size.height) > maxSide else { return image }
        let scale = maxSide / max(image.size.width, image.size.height)
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        return UIGraphicsImageRenderer(size: size).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
    }
}

// Copies locales uniquement : les médias destinés au Mac restent inchangés.
enum SentMediaStore {
    private static var directory: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("MaVieSent", isDirectory: true) }
    static func pageURL(id: String, page: Int) -> URL { directory.appendingPathComponent(page == 0 ? "\(id).jpg" : "\(id).page-\(page + 1).jpg") }
    static func thumbnail(id: String) -> UIImage? { UIImage(contentsOfFile: directory.appendingPathComponent("\(id).thumb.jpg").path) }

    static func save(images: [UIImage], id: String) -> Int {
        do { try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true) } catch { return 0 }
        var count = 0
        for (index, image) in images.enumerated() {
            guard let data = jpeg(image, maxSide: 1600) else { break }
            do { try data.write(to: pageURL(id: id, page: index), options: .atomic); count += 1 } catch { break }
        }
        if let first = images.first, let thumbnail = jpeg(first, maxSide: 180) { try? thumbnail.write(to: directory.appendingPathComponent("\(id).thumb.jpg"), options: .atomic) }
        return count
    }

    static func prune(keeping ids: Set<String>) {
        guard let files = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) else { return }
        for file in files where !ids.contains(where: { file.lastPathComponent.hasPrefix($0 + ".") }) { try? FileManager.default.removeItem(at: file) }
    }

    private static func jpeg(_ image: UIImage, maxSide: CGFloat) -> Data? {
        guard image.size.width > 0, image.size.height > 0 else { return nil }
        let scale = min(1, maxSide / max(image.size.width, image.size.height))
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        return UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor.white.setFill(); context.fill(CGRect(origin: .zero, size: size))
            image.draw(in: CGRect(origin: .zero, size: size))
        }.jpegData(compressionQuality: 0.7)
    }
}
