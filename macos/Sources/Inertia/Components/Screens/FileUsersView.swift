import SwiftUI
import InertiaCore

struct FileUsersView: View {
    @Binding var board: TaskFile
    @State private var draft: UserRecord?
    var body: some View {
        EditorSheet(title: "Users", width: 560, height: 400) {
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
                DoneButton()
            }
        }
        .sheet(item: $draft) { user in
            FileUserEditor(draft: user) { updated in
                if let index = board.users.firstIndex(where: { $0.id == updated.id }) { board.users[index] = updated }
                else { board.users.append(updated) }
                draft = nil
            }
        }
    }
}
