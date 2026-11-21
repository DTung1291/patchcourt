import AppKit
import AVFoundation
import CoreText

let width = 1280
let height = 720
let fps: Int32 = 30
let duration = 44.0
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let assets = root.appendingPathComponent("video/assets")
let output = root.appendingPathComponent("video/output")
let silentURL = output.appendingPathComponent("patchcourt-demo-silent.mp4")
let finalURL = root.appendingPathComponent("video/patchcourt-demo-44s.mp4")
let narrationURL = output.appendingPathComponent("narration.aiff")

try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
try? FileManager.default.removeItem(at: silentURL)
try? FileManager.default.removeItem(at: finalURL)

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat((hex >> 16) & 255) / 255,
            green: CGFloat((hex >> 8) & 255) / 255,
            blue: CGFloat(hex & 255) / 255,
            alpha: alpha)
}

let ink = color(0xF7F8FF)
let muted = color(0xA9B1CF)
let cobalt = color(0x605BFF)
let green = color(0x34E6A1)
let red = color(0xFF5B6E)
let navy = color(0x080B1A)

func ease(_ x: Double) -> CGFloat {
    let v = max(0, min(1, x))
    return CGFloat(v * v * (3 - 2 * v))
}

func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect {
    CGRect(x: x, y: CGFloat(height) - y - h, width: w, height: h)
}

func roundRect(_ ctx: CGContext, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat,
               _ radius: CGFloat, _ fill: CGColor, _ stroke: CGColor? = nil, _ line: CGFloat = 1) {
    let path = CGPath(roundedRect: rect(x, y, w, h), cornerWidth: radius, cornerHeight: radius, transform: nil)
    ctx.addPath(path)
    ctx.setFillColor(fill)
    ctx.fillPath()
    if let stroke {
        ctx.addPath(path)
        ctx.setStrokeColor(stroke)
        ctx.setLineWidth(line)
        ctx.strokePath()
    }
}

func text(_ ctx: CGContext, _ value: String, _ x: CGFloat, _ y: CGFloat,
          _ size: CGFloat, _ fill: CGColor = ink, _ bold: Bool = false,
          _ tracking: CGFloat = 0, _ widthLimit: CGFloat? = nil) {
    let name = bold ? "HelveticaNeue-Bold" : "HelveticaNeue"
    let font = CTFontCreateWithName(name as CFString, size, nil)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: fill,
        .kern: tracking
    ]
    let attr = NSAttributedString(string: value, attributes: attrs)
    if let widthLimit {
        let framesetter = CTFramesetterCreateWithAttributedString(attr)
        let path = CGPath(rect: CGRect(x: x, y: 0, width: widthLimit, height: CGFloat(height) - y), transform: nil)
        let frame = CTFramesetterCreateFrame(framesetter, CFRange(location: 0, length: attr.length), path, nil)
        ctx.saveGState()
        ctx.translateBy(x: 0, y: CGFloat(height))
        ctx.scaleBy(x: 1, y: -1)
        CTFrameDraw(frame, ctx)
        ctx.restoreGState()
    } else {
        let line = CTLineCreateWithAttributedString(attr)
        ctx.textPosition = CGPoint(x: x, y: CGFloat(height) - y - size)
        CTLineDraw(line, ctx)
    }
}

func line(_ ctx: CGContext, _ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat,
          _ stroke: CGColor, _ lineWidth: CGFloat = 2) {
    ctx.setStrokeColor(stroke)
    ctx.setLineWidth(lineWidth)
    ctx.move(to: CGPoint(x: x1, y: CGFloat(height) - y1))
    ctx.addLine(to: CGPoint(x: x2, y: CGFloat(height) - y2))
    ctx.strokePath()
}

func circle(_ ctx: CGContext, _ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ fill: CGColor, _ stroke: CGColor? = nil) {
    let box = CGRect(x: x - r, y: CGFloat(height) - y - r, width: r * 2, height: r * 2)
    ctx.setFillColor(fill)
    ctx.fillEllipse(in: box)
    if let stroke {
        ctx.setStrokeColor(stroke)
        ctx.setLineWidth(2)
        ctx.strokeEllipse(in: box)
    }
}

func loadImage(_ name: String) -> CGImage? {
    guard let image = NSImage(contentsOf: assets.appendingPathComponent(name)) else { return nil }
    var box = CGRect(origin: .zero, size: image.size)
    return image.cgImage(forProposedRect: &box, context: nil, hints: nil)
}

func trimWhite(_ image: CGImage, padding: Int = 12) -> CGImage {
    let w = image.width
    let h = image.height
    let bytesPerRow = w * 4
    var pixels = [UInt8](repeating: 255, count: h * bytesPerRow)
    guard let context = CGContext(data: &pixels, width: w, height: h, bitsPerComponent: 8,
                                  bytesPerRow: bytesPerRow, space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return image }
    context.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
    var minX = w, minY = h, maxX = 0, maxY = 0
    for y in 0..<h {
        for x in 0..<w {
            let index = y * bytesPerRow + x * 4
            if pixels[index] < 242 || pixels[index + 1] < 242 || pixels[index + 2] < 242 {
                minX = min(minX, x); maxX = max(maxX, x)
                minY = min(minY, y); maxY = max(maxY, y)
            }
        }
    }
    guard minX <= maxX, minY <= maxY, let rendered = context.makeImage() else { return image }
    let box = CGRect(x: max(0, minX - padding), y: max(0, minY - padding),
                     width: min(w - minX + padding, maxX - minX + 1 + padding * 2),
                     height: min(h - minY + padding, maxY - minY + 1 + padding * 2))
    return rendered.cropping(to: box) ?? rendered
}

let internetCourt = loadImage("internet-court.png").map { trimWhite($0) }
let arkhai = loadImage("arkhai.png").map { trimWhite($0) }
let genlayer = loadImage("genlayer.png")

func drawImage(_ ctx: CGContext, _ image: CGImage?, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, alpha: CGFloat = 1) {
    guard let image else { return }
    ctx.saveGState()
    ctx.setAlpha(alpha)
    ctx.interpolationQuality = .high
    ctx.draw(image, in: rect(x, y, w, h))
    ctx.restoreGState()
}

func background(_ ctx: CGContext, _ t: Double) {
    let colors = [color(0x070916), color(0x0E1431), color(0x11105C)] as CFArray
    let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 0.62, 1])!
    ctx.drawLinearGradient(gradient,
                           start: CGPoint(x: 0, y: 0),
                           end: CGPoint(x: CGFloat(width), y: CGFloat(height)),
                           options: [])
    ctx.setStrokeColor(color(0xFFFFFF, 0.035))
    ctx.setLineWidth(1)
    let offset = CGFloat((t * 14).truncatingRemainder(dividingBy: 48))
    for x in stride(from: -48.0 + offset, through: Double(width), by: 48) {
        line(ctx, CGFloat(x), 0, CGFloat(x), CGFloat(height), color(0xFFFFFF, 0.035), 1)
    }
    for y in stride(from: -48.0 + offset, through: Double(height), by: 48) {
        line(ctx, 0, CGFloat(y), CGFloat(width), CGFloat(y), color(0xFFFFFF, 0.035), 1)
    }
    text(ctx, "PATCHCOURT  /  INTERNET COURT PARTNER DEMO", 54, 30, 14, color(0xBFC6E8), true, 1.4)
    text(ctx, String(format: "%02.0f", min(t, duration)), 1183, 29, 14, color(0xBFC6E8), true, 1)
    roundRect(ctx, 54, 684, 1172, 3, 1.5, color(0xFFFFFF, 0.13))
    roundRect(ctx, 54, 684, 1172 * CGFloat(t / duration), 3, 1.5, cobalt)
}

func logoCard(_ ctx: CGContext, image: CGImage?, name: String, x: CGFloat, y: CGFloat, w: CGFloat, delay: Double, t: Double) {
    let p = ease((t - delay) / 0.65)
    let yy = y + (1 - p) * 28
    roundRect(ctx, x, yy, w, 128, 22, color(0xFFFFFF, 0.97), color(0xFFFFFF, 0.35))
    if name == "GenLayer" {
        roundRect(ctx, x + 16, yy + 16, w - 32, 68, 12, color(0x070707))
        drawImage(ctx, image, x + 30, yy + 29, w - 60, 40, alpha: p)
    } else {
        drawImage(ctx, image, x + 20, yy + 18, w - 40, 72, alpha: p)
    }
    text(ctx, name.uppercased(), x + 22, yy + 99, 12, color(0x2A2D3D), true, 1.2)
}

func titleBlock(_ ctx: CGContext, kicker: String, title: String, subtitle: String) {
    text(ctx, kicker.uppercased(), 72, 105, 14, color(0x9FA8D5), true, 1.7)
    text(ctx, title, 72, 137, 48, ink, true, -1.2)
    text(ctx, subtitle, 74, 198, 20, muted, false, 0)
}

func caption(_ ctx: CGContext, _ value: String) {
    roundRect(ctx, 72, 615, 1136, 44, 16, color(0x080B1A, 0.86), color(0xFFFFFF, 0.12))
    text(ctx, value, 96, 626, 17, ink, true, 0)
}

func sceneIntro(_ ctx: CGContext, _ t: Double) {
    let p = ease(t / 0.9)
    text(ctx, "PATCH", 72, 128, 76, ink, true, -3)
    text(ctx, "COURT", 306, 128, 76, color(0x7B76FF), true, -3)
    text(ctx, "Natural-language escrow, settled by AI consensus.", 76, 220, 24, muted)
    logoCard(ctx, image: internetCourt, name: "Internet Court", x: 72, y: 344, w: 340, delay: 0.1, t: t)
    logoCard(ctx, image: genlayer, name: "GenLayer", x: 470, y: 344, w: 340, delay: 0.25, t: t)
    logoCard(ctx, image: arkhai, name: "Arkhai", x: 868, y: 344, w: 340, delay: 0.4, t: t)
    circle(ctx, 630, 288, 5 + 8 * p, color(0x7B76FF, 0.35), cobalt)
    caption(ctx, "Three systems. One enforceable agent agreement.")
}

func sceneEscrow(_ ctx: CGContext, _ t: Double) {
    let local = t - 4
    titleBlock(ctx, kicker: "01 / ARKHAI ESCROW", title: "Reward locked before work starts", subtitle: "A Sepolia demand records the obligation and settlement path.")
    roundRect(ctx, 72, 276, 1136, 278, 26, color(0x101633, 0.95), color(0xFFFFFF, 0.12))
    circle(ctx, 190, 414, 69, color(0xFFFFFF), color(0xFFFFFF, 0.2))
    drawImage(ctx, arkhai, 126, 383, 128, 34)
    line(ctx, 280, 414, 865, 414, color(0x655FFF, 0.42), 5)
    let p = ease(local / 2.0)
    circle(ctx, 280 + 585 * p, 414, 11, cobalt, ink)
    roundRect(ctx, 890, 326, 250, 176, 22, color(0x0B1027), color(0x34E6A1, 0.5), 2)
    text(ctx, "ESCROWED", 918, 353, 13, green, true, 1.4)
    text(ctx, "1 PCT", 918, 384, 48, ink, true, -1.5)
    text(ctx, "SEPOLIA", 920, 451, 13, muted, true, 1.3)
    text(ctx, "Demand → evidence → verdict → collect", 327, 447, 17, muted, true)
    caption(ctx, "Arkhai locks the reward and records the obligation.")
}

func sceneEvidence(_ ctx: CGContext, _ t: Double) {
    let local = t - 10
    titleBlock(ctx, kicker: "02 / IMMUTABLE EVIDENCE", title: "One review. One exact commit.", subtitle: "Every accepted GitHub item is fetched using the submitted full SHA.")
    roundRect(ctx, 72, 274, 750, 282, 26, color(0x0C112B, 0.98), color(0xFFFFFF, 0.12))
    text(ctx, "github.com/DTung1291/patchcourt", 105, 305, 16, color(0xC5CAEA), true)
    roundRect(ctx, 105, 350, 682, 70, 14, color(0x080B1A), color(0x605BFF, 0.5))
    text(ctx, "38acf0c25b785634607edce3bdefb7be34ff0027", 129, 372, 16, ink, true, 0.2)
    let p = ease((local - 1.2) / 1.0)
    roundRect(ctx, 105, 451, 330, 58, 14, color(0x34E6A1, 0.12), color(0x34E6A1, 0.55))
    text(ctx, "✓  SHA MATCH", 132, 469, 16, green, true, 0.8)
    roundRect(ctx, 457, 451, 330, 58, 14, color(0xFF5B6E, 0.10), color(0xFF5B6E, 0.45))
    text(ctx, "×  MUTABLE REF", 484, 469, 16, red, true, 0.8)
    roundRect(ctx, 862, 300, 346, 256, 26, color(0x111A3D), color(0xFFFFFF, 0.12))
    circle(ctx, 1035, 382, 56 * p, color(0x605BFF, 0.2), cobalt)
    text(ctx, "LOCK", 985, 368, 27, ink, true, 1.3)
    text(ctx, "HTTP errors and ref mismatches", 900, 470, 15, muted, true)
    text(ctx, "can never approve.", 900, 496, 15, red, true)
    caption(ctx, "Evidence is commit-pinned and verification fails closed.")
}

func sceneConsensus(_ ctx: CGContext, _ t: Double) {
    let local = t - 17
    titleBlock(ctx, kicker: "03 / GENLAYER CONSENSUS", title: "Independent jurors judge meaning", subtitle: "Validators inspect the same evidence and score every criterion.")
    let center = CGPoint(x: 890, y: 409)
    for i in 0..<5 {
        let angle = Double(i) * Double.pi * 2 / 5 - Double.pi / 2
        let x = center.x + CGFloat(cos(angle)) * 176
        let y = center.y + CGFloat(sin(angle)) * 128
        line(ctx, center.x, center.y, x, y, color(0x605BFF, 0.28), 2)
        let active = local > Double(i) * 0.45
        circle(ctx, x, y, active ? 27 : 22, active ? color(0x605BFF) : color(0x22294A), active ? ink : color(0x7880A7))
        text(ctx, active ? "✓" : "·", x - 10, y - 17, 28, active ? ink : muted, true)
    }
    circle(ctx, center.x, center.y, 64, color(0x0A0E23), cobalt)
    text(ctx, "AI", center.x - 20, center.y - 24, 34, ink, true)
    roundRect(ctx, 72, 282, 472, 275, 24, color(0x0C112B, 0.96), color(0xFFFFFF, 0.12))
    let criteria = ["Public interface", "Immutable evidence", "Fail-closed errors", "Settlement bridge"]
    for (i, item) in criteria.enumerated() {
        let y = 315 + CGFloat(i) * 57
        let met = local > 2.2 + Double(i) * 0.72
        circle(ctx, 111, y + 13, 13, met ? green : color(0x303858), met ? green : color(0x66709A))
        text(ctx, met ? "✓" : "·", 103, y + 1, 19, met ? navy : muted, true)
        text(ctx, item, 142, y, 17, met ? ink : muted, true)
    }
    if local > 6.0 && local < 8.5 {
        roundRect(ctx, 648, 527, 484, 44, 14, color(0xFFB84D, 0.12), color(0xFFB84D, 0.5))
        text(ctx, "↻  Leader rotation resolved disagreement", 676, 539, 15, color(0xFFD28A), true)
    }
    caption(ctx, "Criterion-level judgment, not a thin LLM wrapper.")
}

func sceneVerdict(_ ctx: CGContext, _ t: Double) {
    let local = t - 28
    let p = ease(local / 0.9)
    titleBlock(ctx, kicker: "04 / FINALIZED VERDICT", title: "Case #1 · Round 2", subtitle: "Consensus state is explicit, auditable, and terminal when approved.")
    roundRect(ctx, 72, 281, 1136, 272, 30, color(0x0B1625, 0.98), color(0x34E6A1, 0.55), 2)
    circle(ctx, 231, 417, 78 * p, color(0x34E6A1, 0.14), green)
    text(ctx, "✓", 194, 366, 76, green, true)
    text(ctx, "APPROVED", 367, 333, 62, green, true, -2)
    text(ctx, "4 / 4 CRITERIA MET", 371, 416, 22, ink, true, 1.2)
    text(ctx, "GenLayer tx  0x3a1e8a21…0ba1", 371, 465, 16, muted, true)
    text(ctx, "Contract  0x6504cd96…B2583", 371, 496, 16, muted, true)
    caption(ctx, "After leader rotation, GenLayer finalized APPROVED 4/4.")
}

func sceneSettlement(_ ctx: CGContext, _ t: Double) {
    let local = t - 34
    titleBlock(ctx, kicker: "05 / ORACLE RELAY", title: "Consensus becomes settlement", subtitle: "Only a finalized approval can cross the bridge to Arkhai.")
    let xs: [CGFloat] = [156, 480, 804, 1128]
    let labels = ["GENLAYER", "PATCHCOURT", "ARKHAI", "WALLET"]
    let colors = [cobalt, color(0x8D88FF), color(0xFFFFFF), green]
    for i in 0..<xs.count {
        circle(ctx, xs[i], 403, 52, color(0x111733), colors[i])
        text(ctx, i == 3 ? "+1" : i == 2 ? "A" : i == 1 ? "P" : "G", xs[i] - 18, 374, 38, colors[i], true)
        text(ctx, labels[i], xs[i] - 55, 477, 13, muted, true, 1)
        if i < xs.count - 1 {
            line(ctx, xs[i] + 58, 403, xs[i + 1] - 58, 403, color(0x605BFF, 0.42), 5)
        }
    }
    let p = ease(local / 3.4)
    circle(ctx, 214 + 856 * p, 403, 10, green, ink)
    roundRect(ctx, 365, 520, 550, 52, 14, color(0x34E6A1, 0.11), color(0x34E6A1, 0.45))
    text(ctx, "COLLECTED  +1 PCT  ·  SEPOLIA", 467, 536, 16, green, true, 1)
    caption(ctx, "The approved verdict settles the 1 PCT escrow on Sepolia.")
}

func sceneOutro(_ ctx: CGContext, _ t: Double) {
    let local = t - 40
    let p = ease(local / 0.8)
    text(ctx, "REPRODUCIBLE.", 72, 142, 55, ink, true, -1.5)
    text(ctx, "PUBLIC.", 72, 207, 55, color(0x8A86FF), true, -1.5)
    text(ctx, "SETTLED ON-CHAIN.", 72, 272, 55, green, true, -1.5)
    roundRect(ctx, 72, 382, 1136, 122, 24, color(0xFFFFFF, 0.96))
    text(ctx, "github.com/DTung1291/patchcourt", 110, 417, 25, color(0x101326), true)
    text(ctx, "Contract  0x6504cd96933D2C5E5d2cEFb9D6bcB4aAef2B2583", 110, 458, 15, color(0x4C526B), true)
    drawImage(ctx, internetCourt, 920, 530 + (1-p)*20, 270, 54, alpha: p)
    text(ctx, "PATCHCOURT", 72, 544, 24, ink, true, 2)
    caption(ctx, "Internet Court × GenLayer × Arkhai")
}

func render(_ ctx: CGContext, _ t: Double) {
    background(ctx, t)
    if t < 4 { sceneIntro(ctx, t) }
    else if t < 10 { sceneEscrow(ctx, t) }
    else if t < 17 { sceneEvidence(ctx, t) }
    else if t < 28 { sceneConsensus(ctx, t) }
    else if t < 34 { sceneVerdict(ctx, t) }
    else if t < 40 { sceneSettlement(ctx, t) }
    else { sceneOutro(ctx, t) }
}

let writer = try AVAssetWriter(outputURL: silentURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 3_800_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: 60
    ]
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let attrs: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attrs)
guard writer.canAdd(input) else { fatalError("Cannot add video input") }
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let totalFrames = Int(duration * Double(fps))
for frame in 0..<totalFrames {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
    var maybe: CVPixelBuffer?
    let bufferAttrs: [String: Any] = [
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
    ]
    CVPixelBufferCreate(nil, width, height, kCVPixelFormatType_32BGRA, bufferAttrs as CFDictionary, &maybe)
    guard let pixel = maybe else { fatalError("Cannot create pixel buffer") }
    CVPixelBufferLockBaseAddress(pixel, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pixel),
                        width: width,
                        height: height,
                        bitsPerComponent: 8,
                        bytesPerRow: CVPixelBufferGetBytesPerRow(pixel),
                        space: CGColorSpaceCreateDeviceRGB(),
                        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
    render(ctx, Double(frame) / Double(fps))
    let time = CMTime(value: CMTimeValue(frame), timescale: fps)
    adaptor.append(pixel, withPresentationTime: time)
    CVPixelBufferUnlockBaseAddress(pixel, [])
    if frame % 300 == 0 { print("Rendered \(frame)/\(totalFrames)") }
}
input.markAsFinished()
let writeSemaphore = DispatchSemaphore(value: 0)
writer.finishWriting { writeSemaphore.signal() }
writeSemaphore.wait()
guard writer.status == .completed else { fatalError("Video writer failed: \(writer.error?.localizedDescription ?? "unknown")") }

let videoAsset = AVURLAsset(url: silentURL)
let audioAsset = AVURLAsset(url: narrationURL)
let composition = AVMutableComposition()
guard let compositionVideo = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
      let sourceVideo = videoAsset.tracks(withMediaType: .video).first else { fatalError("Missing video track") }
try compositionVideo.insertTimeRange(CMTimeRange(start: .zero, duration: CMTime(seconds: duration, preferredTimescale: 600)), of: sourceVideo, at: .zero)
compositionVideo.preferredTransform = sourceVideo.preferredTransform
if let sourceAudio = audioAsset.tracks(withMediaType: .audio).first,
   let compositionAudio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    let audioDuration = min(CMTimeGetSeconds(audioAsset.duration), duration)
    try compositionAudio.insertTimeRange(CMTimeRange(start: .zero, duration: CMTime(seconds: audioDuration, preferredTimescale: 600)), of: sourceAudio, at: CMTime(seconds: 2.8, preferredTimescale: 600))
}

guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else { fatalError("Cannot create exporter") }
exporter.outputURL = finalURL
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true
let exportSemaphore = DispatchSemaphore(value: 0)
exporter.exportAsynchronously { exportSemaphore.signal() }
exportSemaphore.wait()
guard exporter.status == .completed else { fatalError("Export failed: \(exporter.error?.localizedDescription ?? "unknown")") }
print("Created \(finalURL.path)")
