# Custom Agent Instructions

## Scope & Feature Policy
- **Strict Scope Discipline**: Never add features, buttons, widgets, navigation tabs, or UI controls that the user did not explicitly ask for.
- **No Unsolicited In-App Banners/Buttons**: Do not add custom in-app install buttons, persistent banners, promotional UI, or auxiliary controls unless explicitly requested.
- **Keep Existing Architecture Focused**: Preserve the exact design, layouts, and intended functionality requested by the user.
- **Ask Clarifying Questions**: Always ask clarifying questions if a prompt or request could have multiple interpretations or different meanings before implementing.

## Discussion Mode Commands
- **/discuss**: When in discuss mode, only talk back and forth to achieve plan clarity and discuss the app. Do not read through files again, do not use coding tools, and do not make any code implementations — purely discussion and planning.
- **/discussend**: Exits discuss mode and returns to default agent operation mode.
