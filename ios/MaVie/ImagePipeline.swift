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
        return UIGraphicsImageRenderer(size: size).image { image.draw(in: CGRect(origin: .zero, size: size)) }
    }
}
