import SwiftUI
import InertiaCore

struct FileUsersView: View {
    @Binding var board: TaskFile
    @Environment(\.dismiss) private var dismiss
    @State private var draft: UserRecord?
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Users").font(.title2.bold())
            Text("Optional people stored in this file for assignments and comment authors. No accounts or invitations are created.")
                .foregroundStyle(.secondary)
            List {
                if board.users.isEmpty { Text("No users yet. Tasks and comments also work without them.").foregroundStyle(.secondary) }
                ForEach(board.users) { user in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(user.name).font(.headline)
                            if let email = user.email { Text(email).foregroundStyle(.secondary) }
                        }
                        Spacer()
                        Button("Edit") { draft = user }
                        Button("Remove", role: .destructive) { board.removeUser(user.id) }
                            .help("Clear assignments and keep existing comments and author names")
                    }
                }
            }
            HStack {
                Button("Add User", systemImage: "person.badge.plus") { draft = UserRecord() }
                Spacer()
                Button("Done") { dismiss() }.keyboardShortcut(.defaultAction)
            }
        }.padding(24).frame(width: 560, height: 400)
        .sheet(item: $draft) { user in
            FileUserEditor(draft: user) { updated in
                if let index = board.users.firstIndex(where: { $0.id == updated.id }) { board.users[index] = updated }
                else { board.users.append(updated) }
                draft = nil
            }
        }
    }
}
private struct FileUserEditor: View {
    @State var draft: UserRecord
    let save: (UserRecord) -> Void
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("User").font(.title2.bold())
            Form {
                TextField("Name", text: $draft.name)
                TextField("Email (optional)", text: Binding(get: { draft.email ?? "" }, set: { draft.email = $0.isEmpty ? nil : $0 }))
            }
            HStack {
                Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button("Save") { save(draft) }.keyboardShortcut(.defaultAction)
                    .disabled(draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }.padding(24).frame(width: 400)
    }
}

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
                        Text(comment.createdAt).font(.caption).foregroundStyle(.secondary)
                        Button { comments.removeAll { $0.id == comment.id } } label: { Image(systemName: "trash") }
                            .buttonStyle(.borderless).help("Remove comment")
                    }
                    TextField("Comment", text: $comment.body, axis: .vertical).textFieldStyle(.roundedBorder)
                }.padding(10).background(.quaternary.opacity(0.4), in: RoundedRectangle(cornerRadius: 8))
            }
            TextField("Write a comment…", text: $bodyText, axis: .vertical).lineLimit(3...6).textFieldStyle(.roundedBorder)
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
                .font(.caption).foregroundStyle(.secondary)
        }
    }
}
