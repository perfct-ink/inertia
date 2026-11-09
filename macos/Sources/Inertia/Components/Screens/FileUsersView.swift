import SwiftUI
import InertiaCore

struct FileUsersView: View {
    @Binding var board: TaskFile
    @State private var draft: UserRecord?
    var body: some View {
        EditorSheet(title: "Users", width: 560, height: 400) {
            Text("Optional people stored in this file for assignments and comment authors. No accounts or invitations are created.")
                .voltaMuted()
            List {
                if board.users.isEmpty { Text("No users yet. Tasks and comments also work without them.").voltaMuted() }
                ForEach(board.users) { user in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(user.name).voltaFont(.sm, weight: .semibold).foregroundStyle(Volta.foreground)
                            if let email = user.email { Text(email).voltaMuted() }
                        }
                        Spacer()
                        Button("Edit") { draft = user }.buttonStyle(.volta(.ghost))
                        Button("Remove", role: .destructive) { board.removeUser(user.id) }.buttonStyle(.volta(.ghost))
                            .help("Clear assignments and keep existing comments and author names")
                    }
                }
            }.voltaList()
            HStack {
                Button("Add User", systemImage: "person.badge.plus") { draft = UserRecord() }.buttonStyle(.volta(.secondary))
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
