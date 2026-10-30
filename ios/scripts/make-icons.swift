import AppKit
import Foundation

guard CommandLine.arguments.count == 3 else { print("usage: swift make-icons.swift source.png destination-directory"); exit(2) }
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let destination = URL(fileURLWithPath: CommandLine.arguments[2])
guard let input = NSImage(contentsOf: source) else { fatalError("Impossible de lire l'icône") }
let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()
NSColor(calibratedRed: 13 / 255, green: 15 / 255, blue: 19 / 255, alpha: 1).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: size)).fill()
input.draw(in: NSRect(origin: .zero, size: size), from: .zero, operation: .sourceOver, fraction: 1)
image.unlockFocus()
guard let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) else { fatalError("Impossible d'exporter l'icône") }
try! FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)
try! png.write(to: destination.appendingPathComponent("icon-1024.png"))
