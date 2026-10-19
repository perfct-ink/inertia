## Code Requirements

### General Coding Standards

#### DRY
Code should not be repeated ever unless its more performant to have it written twice (there are rare instances). If meta programming is available, that's preferred too. If there are any files that use the same or similar functions, consolidate if possible.

### Linting
All code should be linted to match common style guides. `npm run lint` runs ESLint
(`eslint.config.mjs`) and Stylelint (`stylelint.config.mjs`) over the repository and must
report no errors. New and shared code follows the full rule sets (eslint:recommended plus
the React and React Hooks sets; stylelint-config-standard-scss). The original page scripts
and the views' stylesheets are checked for mistakes only, and API findings that would mean
editing working code are warnings: fix those deliberately, never as tidying.

### Frontend Requirements

#### Responsive Design
All pages should consider different widths and fit the content appropriately without having to scroll horizontally unless intended. Dark mode should always exist for shared components.

#### Styles
Style tags should never be used in html unless they are absolutely necessary or its part of CSS modules. SCSS is the preferred compiler for CSS. CSS files should be loaded and cached. CSS should only exist app-wide or view-specific. App-wide examples are resets, fonts, themes, colors, global styles, ui components, libraries, and shared resources. View-specific should be lean and make unique changes for that particular view.

#### Class Names
Class Names should be similar to OOCSS, but slight differences.
- Use a single dash to show inheritance, namespacing, or a relationship with a component.
- Use two dashes (--) to show a single class has different states applied to it. (eg. view-users-hover).
- Use underscores to show one term with many words, not a relationship. (eg. active_users, network_segments, user_logins)

#### Inheritance
There should be a set of layers to follow cascading/specificity:
1. Libraries - Global/native styles, and all the external libraries applying styles after. (UI Components pulled externally).
2. App - App specific styles across the entire app. (Themes, Fonts, UI Components only used in App).
3. View - View-specific overrides that make the view look right. These should typically be minimal to nonexistent. (This view should have a red button cause I said so).

#### JavaScript
Javsacript tags should never be used in html, unless its specifically for data (cannot be cached) or required by a library. JavaScript should be loaded from files, that are cached by the browser. TypeScript is permitted if using vite or webpack.

#### Middleware
Any failed API calls should show an error. Failed authentication requests should require reauthentication.

#### UI Components
Any common recurring UI components such as buttons, inputs, textfields, selects, dropdowns, checkboxes, radio buttons, form elements, modals, panes, cards, etc. should always be saved to their own files. This means their own SCSS and if its a robust enough component, its own JavaScript. It is robust when there is javascript put on the component in order to function (eg. not buttons, but modals). Typography should exist is one scss file. Margin and padding should should be one one scss file. UI components should have a root class that is prepended with "ui-" (eg. ui-button, ui-modal). All UI components should have a light and dark mode. Any UI component that the user can interact with should have at least a subtle hover state. If the user can't interact with it, it probably shouldn't have a hover state.

#### Native Components
Native dialog boxes should not be used if possible. Use a modal UI component. Native form components (input texts, select tags, checkbox, radio) should be styled by using a matching UI components.

#### Views
Every "page" should have its own view. Views can override UI component scss with their own scss. The root html element in a view component should have the css class that starts with "view-" and is lowercase. (eg. view-studies-list). Views are app views and should be in a "view" directory. Views ideally would have their own page title as well.

#### Data File
The purpose of this is to separate data from views like in Model in MVC or Data Tier in Three-Tier Architectures. There should always be a data file for that has parity with the data entity. If the source of the data entity exists in another API, the data file should attempt to stay in sync with that data. For example, if there's an enumeration, that should exist in the data entity's file. All data-only functions (and definitely pure functions) should exist in the data file, for example Filtering, Searching, Sorting, aggregation functions that are only of that single data entity should exist in that data file. This makes unit testing data functions very easy. Filenames should be singular.

### API
All API calls should be organized by the API they are integrating with. There should be a base API file for those calls. Each model should have its own file and class as well, matching the Data File paradigm. The api files should be in an api folder, unless there are multiple apis, in which case there would be an apis folder.

#### Frontend Views
Views should be in view folder and contain every file type for that view (html, jsx, js, scss, css, etc.) unless its a shared component.

#### Library Utilities
Pure functions that are utilities should be in util folder.

#### Accessibility Standards
Follow https://www.w3.org/TR/WCAG21/ for standards. Use ARIA Attributes for accessibility.

#### Compilers
If using a compiler, if in the dev environment (NODE_ENV?), do not obfuscate and provide a sourcemap. If in production, obfuscate, minify, and optimize for performance.
