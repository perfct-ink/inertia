module Api
  module V1
    # The signed-in person's own keystrokes for paragraph styles. Like the styles
    # themselves they belong to the person, not to a Space. Keystrokes are found
    # by style id ("quote", "custom-12"), and a style has at most one: PUT sets or
    # replaces it, DELETE removes it. A keystroke already on another of the
    # person's styles is refused (422), never moved.
    class ParagraphStyleShortcutsController < ApplicationController
      def index
        render json: ParagraphStyleShortcutBlueprint.render(current_user.paragraph_style_shortcuts.order(:id))
      end

      def update
        shortcut = current_user.paragraph_style_shortcuts.find_or_initialize_by(style: params[:style])
        shortcut.keys = params.require(:paragraph_style_shortcut).require(:keys)
        if shortcut.save
          render json: ParagraphStyleShortcutBlueprint.render(shortcut)
        else
          render json: { errors: shortcut.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        current_user.paragraph_style_shortcuts.find_by!(style: params[:style]).destroy!
        head :no_content
      end
    end
  end
end
