import { z } from 'zod';
import type { RoutePoints } from '.';

export const RoutePointSchema = z.object({
  label: z.string(),
  coords: z.tuple([z.number(), z.number()]),
  durationToNext: z.number().nonnegative().optional(),
});

export const RoutePointsSchema = z.array(RoutePointSchema);

export function validateRoutePoints(input: unknown): RoutePoints {
  return RoutePointsSchema.parse(input);
}

export function safeParseRoutePoints(input: unknown) {
  return RoutePointsSchema.safeParse(input);
}
