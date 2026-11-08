import SwiftUI
import InertiaCore

struct TaskCommentsView: View {
    @Binding var comments: [TaskComment]
    let users: [UserRecord]
    @State private var bodyText = ""
    @State private var authorID: Int?
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Comments (\(comments.count))").font(.headline)
            ForEach($comments) { $comment in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(comment.authorName ?? users.first(where: { $0.id == comment.authorID })?.name ?? "No author").font(.subheadline.bold())
                        Spacer()
                        Text(comment.createdAt).font(.caption).foregroundStyle(Volta.mutedForeground)
                        Button { comments.removeAll { $0.id == comment.id } } label: { Image(systemName: "trash") }
                            .buttonStyle(.borderless).help("Remove comment")
                    }
                    TextField("Comment", text: $comment.body, axis: .vertical)
                }.padding(10).background(Volta.muted, in: RoundedRectangle(cornerRadius: 8))
            }
            TextField("Write a comment…", text: $bodyText, axis: .vertical).lineLimit(3...6)
            HStack {
                Picker("Author", selection: $authorID) {
                    Text("No author").tag(nil as Int?)
                    ForEach(users) { Text($0.name).tag(Optional($0.id)) }
                }
                Button("Add Comment") {
                    comments.append(TaskComment(body: bodyText, author: users.first { $0.id == authorID }))
                    bodyText = ""
                }.disabled(bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            Text("Add your comment, then Save the task to keep changes. Author names are local labels, not verified identities.")
                .font(.caption).foregroundStyle(Volta.mutedForeground)
        }
    }
}
