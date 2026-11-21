import AppKit
import AVFoundation
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let url = root.appendingPathComponent("video/patchcourt-demo-44s.mp4")
let framesDirectory = root.appendingPathComponent("video/output/frames")
try FileManager.default.createDirectory(at: framesDirectory, withIntermediateDirectories: true)

let asset = AVURLAsset(url: url)
let duration = CMTimeGetSeconds(asset.duration)
let videoTracks = asset.tracks(withMediaType: .video)
let audioTracks = asset.tracks(withMediaType: .audio)
guard let videoTrack = videoTracks.first else { fatalError("No video track") }
print(String(format: "duration=%.3f", duration))
print("dimensions=\(Int(videoTrack.naturalSize.width))x\(Int(videoTrack.naturalSize.height))")
print("videoTracks=\(videoTracks.count) audioTracks=\(audioTracks.count)")

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero

for second in [1.0, 7.0, 13.0, 22.0, 30.0, 37.0, 42.0] {
    let time = CMTime(seconds: second, preferredTimescale: 600)
    let image = try generator.copyCGImage(at: time, actualTime: nil)
    let target = framesDirectory.appendingPathComponent(String(format: "frame-%02.0f.png", second))
    guard let destination = CGImageDestinationCreateWithURL(target as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        fatalError("Cannot create image destination")
    }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { fatalError("Cannot save \(target.path)") }
}
