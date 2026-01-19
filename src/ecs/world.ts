import { createWorld, defineComponent, Types, addEntity, addComponent, IWorld, defineQuery } from 'bitecs';

// Component definitions
export const Position = defineComponent({
  q: Types.i32,
  r: Types.i32,
});

export const TerrainComponent = defineComponent({
  type: Types.ui8,
});

export const FeatureComponent = defineComponent({
  type: Types.ui8,
  hasFeature: Types.ui8,
});

export const ResourceComponent = defineComponent({
  type: Types.ui8,
  hasResource: Types.ui8,
});

export const YieldsComponent = defineComponent({
  food: Types.i32,
  production: Types.i32,
  gold: Types.i32,
  science: Types.i32,
  culture: Types.i32,
  faith: Types.i32,
});

export const RiverComponent = defineComponent({
  edges: Types.ui8,
});

// Unit-related components
export const UnitComponent = defineComponent({
  type: Types.ui8, // UnitType enum value
});

export const MovementComponent = defineComponent({
  current: Types.ui8, // Remaining movement points this turn
  max: Types.ui8, // Maximum movement points
});

export const OwnerComponent = defineComponent({
  playerId: Types.ui8,
});

// Create world
export function createGameWorld(): IWorld {
  return createWorld();
}

// Entity creation helper
export function createTileEntity(world: IWorld, q: number, r: number, terrainType: number): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, TerrainComponent, eid);

  Position.q[eid] = q;
  Position.r[eid] = r;
  TerrainComponent.type[eid] = terrainType;

  return eid;
}

// Add feature to an existing tile entity
export function addFeatureToEntity(world: IWorld, eid: number, featureType: number): void {
  addComponent(world, FeatureComponent, eid);
  FeatureComponent.type[eid] = featureType;
  FeatureComponent.hasFeature[eid] = 1;
}

// Add resource to an existing tile entity
export function addResourceToEntity(world: IWorld, eid: number, resourceType: number): void {
  addComponent(world, ResourceComponent, eid);
  ResourceComponent.type[eid] = resourceType;
  ResourceComponent.hasResource[eid] = 1;
}

// Add yields to an existing tile entity
export function addYieldsToEntity(
  world: IWorld,
  eid: number,
  food: number,
  production: number,
  gold: number,
  science: number = 0,
  culture: number = 0,
  faith: number = 0
): void {
  addComponent(world, YieldsComponent, eid);
  YieldsComponent.food[eid] = food;
  YieldsComponent.production[eid] = production;
  YieldsComponent.gold[eid] = gold;
  YieldsComponent.science[eid] = science;
  YieldsComponent.culture[eid] = culture;
  YieldsComponent.faith[eid] = faith;
}

// Add river edges to an existing tile entity
export function addRiverToEntity(world: IWorld, eid: number, edges: number): void {
  addComponent(world, RiverComponent, eid);
  RiverComponent.edges[eid] = edges;
}

// Unit entity creation helper
export function createUnitEntity(
  world: IWorld,
  q: number,
  r: number,
  unitType: number,
  playerId: number,
  maxMovement: number
): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, UnitComponent, eid);
  addComponent(world, MovementComponent, eid);
  addComponent(world, OwnerComponent, eid);

  Position.q[eid] = q;
  Position.r[eid] = r;
  UnitComponent.type[eid] = unitType;
  MovementComponent.current[eid] = maxMovement;
  MovementComponent.max[eid] = maxMovement;
  OwnerComponent.playerId[eid] = playerId;

  return eid;
}

// Unit queries
export const unitQuery = defineQuery([Position, UnitComponent, MovementComponent, OwnerComponent]);
