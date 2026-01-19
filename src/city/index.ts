export {
  FOOD_PER_POPULATION,
  INITIAL_TERRITORY_RADIUS,
  BASE_GROWTH_THRESHOLD,
  GROWTH_THRESHOLD_MULTIPLIER,
  calculateGrowthThreshold,
  DEFAULT_CITY_NAMES,
} from './CityData';

export { TerritoryManager } from './Territory';

export {
  getNextCityName,
  getCityNameByIndex,
  getCityNameCount,
} from './CityNameGenerator';

export {
  canFoundCity,
  getFoundCityBlockReason,
  foundCity,
  tryFoundCity,
  type FoundCityResult,
} from './CityFounder';

export {
  BuildableType,
  buildableToUnitType,
  getBuildableCost,
  getBuildableName,
  getAvailableBuildables,
} from './Buildable';

export { calculateCityYields, calculateNetFood } from './CityYields';

export {
  CityProcessor,
  type ProductionCompletedEvent,
  type PopulationGrowthEvent,
  type CityProcessorCallbacks,
} from './CityProcessor';
