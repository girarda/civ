import { createWorld, defineComponent, Types, addEntity, addComponent, IWorld } from 'bitecs';

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
