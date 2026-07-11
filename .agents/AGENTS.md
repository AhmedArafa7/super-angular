# Arcade Games Architecture Guidelines

Based on user request, the following rule MUST be applied to all current and future games within the Arcade/Games section:

## Standardized Game Modes
Every game must implement **exactly three** play modes. The UI should clearly present these three options to the user before starting the game:

1. **اللعب محلياً (Local Play)**: 
   - Hotseat / shared screen multiplayer.
   - Supports 4 to 6 players on the same device, depending on the game's nature.
   
2. **إنشاء غرفة (Private Room/P2P)**: 
   - A player creates a private room and shares a code/link.
   - Friends can join the room to play together online.
   
3. **لعب أونلاين (Online Matchmaking / Pro Mode)**: 
   - Public online matchmaking against random opponents.
   - **Restriction**: This mode is strictly reserved for subscribed "Pro" users. Non-pro users should see a premium lock/prompt to upgrade.

