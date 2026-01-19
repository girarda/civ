/**
 * Action barrel exports and auto-registration.
 * Importing this module triggers registration of all action definitions.
 */

// Import all action files to trigger auto-registration
import './MoveAction';
import './AttackAction';
import './FoundCityAction';
import './SetProductionAction';
import './EndTurnAction';

// Re-export actions for direct access if needed
export { MoveAction } from './MoveAction';
export { AttackAction } from './AttackAction';
export { FoundCityAction } from './FoundCityAction';
export { SetProductionAction } from './SetProductionAction';
export { EndTurnAction } from './EndTurnAction';
