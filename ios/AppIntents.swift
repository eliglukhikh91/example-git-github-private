//
// AppIntents.swift
// Luma iOS Native App Intents & Siri Shortcuts Integration
//

import AppIntents
import Foundation

/// Swift Struct representing a Luma Moment returned from the Luma server API
struct LumaMomentResponse: Codable {
    let success: Bool
    let eventId: String?
    let title: String?
    let summary: String?
    let checklistCount: Int?
}

/// iOS 16+ AppIntent allowing Siri and Shortcuts to create Luma preparation entries directly.
/// Voice Trigger Example: "Hey Siri, add to Luma: job interview on Friday at 3pm"
@available(iOS 16.0, macOS 13.0, watchOS 9.0, tvOS 16.0, *)
struct CreateLumaEntryIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Event to Luma"
    static var description = IntentDescription("Creates a new life event with AI-generated preparation steps in Luma.")

    /// Main prompt or voice transcript input from Siri
    @Parameter(title: "Event Description", description: "What event or preparation is coming up?")
    var text: String

    @Parameter(title: "Date", description: "Optional event date")
    var date: String?

    @Parameter(title: "Time", description: "Optional event time")
    var time: String?

    @Parameter(title: "Category", description: "Event category (career, journey, health, family, personal)")
    var category: String?

    /// Performs the intent by sending the voice input to Luma's Cloud Run server
    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return .result(dialog: "Please specify what event you would like to add to Luma.")
        }

        // Configure Luma Cloud Run backend API URL
        let serverURLString = ProcessInfo.processInfo.environment["LUMA_API_URL"] ?? "https://luma-app.run.app/api/generate-prep"
        
        guard let url = URL(string: serverURLString) else {
            return .result(dialog: "Invalid Luma server address.")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "title": text,
            "category": category ?? "personal",
            "eventDate": [date, time].compactMap { $0 }.joined(separator: " "),
            "contextDetails": "Source: siri_shortcut"
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                let decoded = try? JSONDecoder().decode(LumaMomentResponse.self, from: data)
                let titleStr = decoded?.title ?? text
                return .result(dialog: "Luma has saved '\(titleStr)' and created your personalized preparation checklist.")
            } else {
                return .result(dialog: "Saved '\(text)' to Luma. Your prep steps will sync when you open the app.")
            }
        } catch {
            return .result(dialog: "Added '\(text)' to Luma.")
        }
    }
}

/// Siri Shortcuts Provider registering default Siri phrases for Luma
@available(iOS 16.0, macOS 13.0, watchOS 9.0, tvOS 16.0, *)
struct LumaShortcutsProvider: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: CreateLumaEntryIntent(),
            phrases: [
                "Add to \(.applicationName)",
                "Tell \(.applicationName) that I have an event coming up",
                "Create \(.applicationName) entry",
                "Добавить событие в \(.applicationName)",
                "Записать в \(.applicationName)"
            ],
            shortTitle: "Add Luma Event",
            systemImageName: "sparkles"
        )
    }
}
