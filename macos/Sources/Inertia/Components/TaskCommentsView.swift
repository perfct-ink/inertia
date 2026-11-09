import SwiftUI
import InertiaCore

struct TaskCommentsView: View {
    @Binding var comments: [TaskComment]
    let users: [UserRecord]
    @State private var bodyText = ""
    @State private var authorID: Int?
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Comments (\(comments.count))").voltaFont(.sm, weight: .semibold).foregroundStyle(Volta.foreground)
            ForEach($comments) { $comment in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(comment.authorName ?? users.first(where: { $0.id == comment.authorID })?.name ?? "No author")
                            .voltaFont(.sm, weight: .semibold).foregroundStyle(Volta.foreground)
                        Spacer()
                        Text(comment.createdAt).voltaCaption()
                        Button { comments.removeAll { $0.id == comment.id } } label: { Image(systemName: "trash") }
                            .buttonStyle(.volta(.ghost)).help("Remove comment").accessibilityLabel("Remove comment")
                    }
                    TextField("Comment", text: $comment.body, axis: .vertical)
                }.padding(10).voltaSurface(.muted)
            }
            TextField("Write a comment…", text: $bodyText, axis: .vertical).lineLimit(3...6)
            HStack {
                VoltaSelect("Author", selection: $authorID, options: SelectChoices.optional(none: "No author", users, id: \.id, label: \.name))
                Button("Add Comment") {
                    comments.append(TaskComment(body: bodyText, author: users.first { $0.id == authorID }))
                    bodyText = ""
                }.buttonStyle(.volta(.primary)).disabled(bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            Text("Add your comment, then Save the task to keep changes. Author names are local labels, not verified identities.")
                .voltaCaption()
        }
    }
}
