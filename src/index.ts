/**
 * YMove Exercise Video API SDK
 *
 * 1,413+ HD exercise videos, workout generation, program builder, and AI posture analysis.
 * Get your API key at https://ymove.app/exercise-api (free trial).
 *
 * @example
 * ```typescript
 * import { YMoveClient } from 'ymove-exercise-api';
 *
 * const ymove = new YMoveClient('your_api_key');
 *
 * // List chest exercises
 * const { data } = await ymove.exercises.list({ muscleGroup: 'chest' });
 *
 * // Generate a workout
 * const workout = await ymove.workouts.generate({ muscleGroup: 'chest', difficulty: 'intermediate' });
 *
 * // Generate a 4-week program
 * const program = await ymove.programs.generate({ goal: 'muscle_building', daysPerWeek: 4, weeks: 4 });
 * ```
 */

import { Transport, HttpTransport, YMoveError, DEFAULT_BASE_URL } from './transport';

export { Transport, HttpTransport, YMoveError, DEFAULT_BASE_URL };

// ── Types ──────────────────────────────────────────────

/**
 * Five framings of one frame from the clip.
 *
 * The frame is picked from across the clip for a visible face and the most
 * extended pose, so a jump is caught mid-air rather than at the rest position
 * the clip opens on. Each crop is centred on the person by face detection and
 * white-balanced after cropping, so clips from different shoots match in a grid.
 *
 * Sizes are ceilings: images are never upscaled, so a crop is only as large as
 * the source clip allows. Unlike the video URLs these are static: no token, no
 * expiry, safe to cache and store, and they never count against your cap.
 *
 * They accompany the video whenever one is returned. On Scale they are also
 * returned without a video (browse mode, `excludeVideos`); on the capped plans
 * they are not, so the monthly exercise limit stays visible while you build.
 */
export interface Thumbnails {
  /** Up to 600x800 (3:4). The default, and what `thumbnailUrl` points at. */
  default: string;
  /** Up to 600x600 (1:1). List rows and grid tiles. */
  square: string;
  /** Up to 720x1280 (9:16). Matches the video, for full-bleed mobile. */
  portrait: string;
  /** Up to 1280x720 (16:9). Wide cards and player poster frames; tall poses crop to the upper body. */
  landscape: string;
  /** The whole frame, uncropped, as shot (~9:16). */
  original: string;
}

export interface Video {
  /** Stable unique ID of this video. Does not change when the signed URLs do. */
  id: string;
  videoUrl: string | null;
  videoHlsUrl: string | null;
  /** Same as `thumbnails.default` (600x800, 3:4). */
  thumbnailUrl: string | null;
  thumbnails: Thumbnails | null;
  tag: 'white-background' | 'gym-shot';
  /**
   * Video aspect orientation. Most exercise clips are PORTRAIT (vertical, ~9:16),
   * shot for mobile. Do not assume landscape: read this field and size the player
   * to match (for portrait, `aspect-ratio: 9/16` with `object-fit: cover`).
   */
  orientation: 'landscape' | 'portrait';
  isPrimary: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  instructions: string[] | null;
  importantPoints: string[] | null;
  muscleGroup: string;
  secondaryMuscles: string[] | null;
  equipment: string;
  category: string | null;
  difficulty: string | null;
  exerciseType: string[] | null;
  videoUrl: string | null;
  videoHlsUrl: string | null;
  /** Same as `thumbnails.default` (600x800, 3:4). Present without video URLs on Scale only. */
  thumbnailUrl: string | null;
  thumbnails: Thumbnails | null;
  videoDurationSecs: number | null;
  hasVideo: boolean;
  hasVideoWhite: boolean;
  hasVideoGym: boolean;
  videos: Video[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MuscleGroup {
  slug: string;
  name: string;
  exerciseCount: number;
}

export interface ExerciseType {
  slug: string;
  name: string;
  description: string;
  exerciseCount: number;
}

export interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  restSeconds: number;
  order: number;
}

export interface Workout {
  name: string;
  muscleGroup: string;
  difficulty: string;
  estimatedMinutes: number;
  exerciseCount: number;
  exercises: WorkoutExercise[];
}

export interface ProgramDay {
  day: number;
  name: string;
  muscleGroups: string[];
  exercises: WorkoutExercise[];
}

export interface Program {
  name: string;
  goal: string;
  daysPerWeek: number;
  weeks: number;
  split: string;
  weeklySchedule: ProgramDay[];
  notes: string;
}

export interface PostureIssue {
  area: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  exercises: Exercise[];
}

export interface PostureAnalysis {
  score: number;
  issues: PostureIssue[];
  summary: string;
  frames_analyzed: number;
  analysis_type: string;
}

export interface Usage {
  plan: string;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  percentUsed: number;
  whiteVideoAccess: boolean;
  premiumVideoAccess: boolean;
}

export interface Food {
  id: string;
  fdcId: number | null;
  name: string;
  shortName: string;
  displayName: string;
  brand: string | null;
  category: string | null;
  servingSize: number;
  servingDescription: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  cholesterol: number | null;
  saturatedFat: number | null;
  barcode: string | null;
  imageUrl: string | null;
  source: string;
}

export interface FoodLogItem {
  name: string;
  estimatedGrams: number;
  confidence: 'high' | 'medium' | 'low';
  matchedFood?: { id: string; name: string; servingSize: number };
  nutrition?: { calories: number; protein: number; fat: number; carbs: number };
}

export interface FoodLogResult {
  items: FoodLogItem[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
}

export interface MealCalculation {
  items: Array<{
    foodId: string;
    name: string;
    quantityG: number;
    nutrition: { calories: number; protein: number; fat: number; carbs: number };
  }>;
  totals: { calories: number; protein: number; fat: number; carbs: number };
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructions: string[];
  prepTimeMin: number;
  cookTimeMin: number;
  servings: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType: string;
  dietTags: string[];
  cuisineType: string | null;
  difficulty: string | null;
  imageUrl: string | null;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  gramsEquivalent: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  order: number;
  food: { id: string; name: string; servingSize: number } | null;
}

export interface MealTypeCount {
  mealType: string;
  count: number;
}

export interface DietCount {
  diet: string;
  count: number;
}

// ── Filter / Param types ───────────────────────────────

export type MuscleGroupSlug =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'full_body';

export type EquipmentSlug = 'machine' | 'barbell' | 'dumbbell' | 'kettlebell' | 'bodyweight' | 'cable';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type ExerciseTypeSlug =
  | 'strength' | 'yoga' | 'stretching' | 'cardio' | 'plyometric' | 'calisthenics'
  | 'warmup' | 'cooldown' | 'balance' | 'mobility' | 'isometric' | 'rehabilitation'
  | 'functional' | 'core' | 'hiit';

export type ProgramGoal = 'muscle_building' | 'weight_loss' | 'strength' | 'endurance';

export interface ListExercisesParams {
  muscleGroup?: MuscleGroupSlug;
  exerciseType?: ExerciseTypeSlug;
  equipment?: EquipmentSlug;
  difficulty?: Difficulty;
  hasVideo?: boolean;
  hasVideoWhite?: boolean;
  hasVideoGym?: boolean;
  videoTag?: 'white-background' | 'gym-shot';
  search?: string;
  page?: number;
  pageSize?: number;
  /**
   * Include playable video URLs. Each returned exercise then counts toward your
   * monthly cap. Omitted, this follows your key's default. Thumbnails come with
   * the video; on Scale they are returned in browse mode too.
   */
  includeVideos?: boolean;
  /** The same switch from the other side; wins over includeVideos. */
  excludeVideos?: boolean;
}

export interface GetExerciseParams {
  /**
   * Return metadata without the video URLs, in which case the exercise does not
   * count toward your monthly cap. Thumbnails come with it on Scale; on the
   * capped plans they go with the video. Videos are included by default here.
   */
  excludeVideos?: boolean;
}

export interface GenerateWorkoutParams {
  muscleGroup: MuscleGroupSlug;
  equipment?: EquipmentSlug;
  difficulty?: Difficulty;
  exerciseCount?: number;
}

export interface GenerateProgramParams {
  goal?: ProgramGoal;
  daysPerWeek?: number;
  weeks?: 4 | 8 | 12;
  equipment?: EquipmentSlug;
}

export interface SearchFoodsParams {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface CalculateMealParams {
  items: Array<{ foodId: string; quantityG?: number }>;
}

export interface LogFoodTextParams {
  text: string;
}

export interface LogFoodPhotoParams {
  image: string;
  media_type?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

export interface SearchRecipesParams {
  q?: string;
  mealType?: string;
  diet?: string;
  cuisine?: string;
  maxCalories?: number;
  minProtein?: number;
  difficulty?: string;
  page?: number;
  pageSize?: number;
}

export interface AnalyzePostureParams {
  images: Array<{
    type: 'base64';
    data: string;
    media_type?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  }>;
  analysis_type?: 'standing' | 'seated' | 'general';
}

// ── API Response wrappers ──────────────────────────────

interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}

interface SingleResponse<T> {
  data: T;
}

// ── Client ─────────────────────────────────────────────

export interface YMoveClientOptions {
  baseUrl?: string;
  /**
   * Transport to use for requests. Defaults to `HttpTransport`.
   * Pass an `McpTransport` (from `ymove-exercise-api/mcp`) to route calls through
   * the local `ymove-exercise-mcp` server instead of direct HTTPS.
   */
  transport?: Transport;
}

export class YMoveClient {
  private transport: Transport;

  public exercises: ExerciseResource;
  public workouts: WorkoutResource;
  public programs: ProgramResource;
  public posture: PostureResource;
  public foods: FoodResource;
  public recipes: RecipeResource;

  /**
   * Create a new YMove API client.
   *
   * @param apiKey - Your API key. Get one at https://ymove.app/exercise-api/signup
   * @param options - Optional configuration. `transport` overrides the default HTTP transport.
   */
  constructor(apiKey: string, options?: YMoveClientOptions) {
    this.transport = options?.transport ?? new HttpTransport(apiKey, options?.baseUrl);
    this.exercises = new ExerciseResource(this);
    this.workouts = new WorkoutResource(this);
    this.programs = new ProgramResource(this);
    this.posture = new PostureResource(this);
    this.foods = new FoodResource(this);
    this.recipes = new RecipeResource(this);
  }

  /** @internal */
  request<T>(path: string, options?: RequestInit): Promise<T> {
    return this.transport.request<T>(path, options);
  }

  /**
   * Release any resources the transport holds (e.g. shut down the MCP
   * subprocess when using `McpTransport`). Safe to call on the default
   * HTTP transport (no-op).
   */
  async close(): Promise<void> {
    if (this.transport.close) await this.transport.close();
  }

  /**
   * Check your current API usage and limits.
   */
  async getUsage(): Promise<Usage> {
    const res = await this.request<SingleResponse<Usage>>('/usage');
    return res.data;
  }
}

class ExerciseResource {
  constructor(private client: YMoveClient) {}

  /**
   * List and search exercises with filters.
   */
  async list(params?: ListExercisesParams): Promise<ListResponse<Exercise>> {
    const query = toQuery(params);
    return this.client.request<ListResponse<Exercise>>(`/exercises${query}`);
  }

  /**
   * Get a single exercise by ID (UUID) or slug.
   */
  async get(idOrSlug: string, params?: GetExerciseParams): Promise<Exercise> {
    const query = toQuery(params);
    const res = await this.client.request<SingleResponse<Exercise>>(
      `/exercises/${encodeURIComponent(idOrSlug)}${query}`
    );
    return res.data;
  }

  /**
   * List all muscle groups with exercise counts.
   */
  async muscleGroups(): Promise<MuscleGroup[]> {
    const res = await this.client.request<SingleResponse<MuscleGroup[]>>('/exercises/muscle-groups');
    return res.data;
  }

  /**
   * List all exercise types with counts.
   */
  async exerciseTypes(): Promise<ExerciseType[]> {
    const res = await this.client.request<SingleResponse<ExerciseType[]>>('/exercises/exercise-types');
    return res.data;
  }
}

class WorkoutResource {
  constructor(private client: YMoveClient) {}

  /**
   * Generate a structured workout with exercises, sets, reps, and rest times.
   */
  async generate(params: GenerateWorkoutParams): Promise<Workout> {
    const query = toQuery(params);
    const res = await this.client.request<SingleResponse<Workout>>(`/workouts/generate${query}`);
    return res.data;
  }
}

class ProgramResource {
  constructor(private client: YMoveClient) {}

  /**
   * Generate a multi-week training program with periodization.
   */
  async generate(params?: GenerateProgramParams): Promise<Program> {
    const query = toQuery(params);
    const res = await this.client.request<SingleResponse<Program>>(`/programs/generate${query}`);
    return res.data;
  }
}

class PostureResource {
  constructor(private client: YMoveClient) {}

  /**
   * Analyze posture from one or more images using AI.
   * Returns a posture score, identified issues, and corrective exercises.
   */
  async analyze(params: AnalyzePostureParams): Promise<PostureAnalysis> {
    const res = await this.client.request<SingleResponse<PostureAnalysis>>('/posture/analyze', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  }
}

class FoodResource {
  constructor(private client: YMoveClient) {}

  async search(params?: SearchFoodsParams): Promise<ListResponse<Food>> {
    const query = toQuery(params);
    return this.client.request<ListResponse<Food>>(`/foods${query}`);
  }

  async get(id: string): Promise<Food> {
    const res = await this.client.request<SingleResponse<Food>>(`/foods/${encodeURIComponent(id)}`);
    return res.data;
  }

  async barcode(upc: string): Promise<Food> {
    const res = await this.client.request<SingleResponse<Food>>(`/foods/barcode/${encodeURIComponent(upc)}`);
    return res.data;
  }

  async calculateMeal(params: CalculateMealParams): Promise<MealCalculation> {
    const res = await this.client.request<SingleResponse<MealCalculation>>('/meals/calculate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  }

  async logText(params: LogFoodTextParams): Promise<FoodLogResult> {
    const res = await this.client.request<SingleResponse<FoodLogResult>>('/foods/log/text', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  }

  async logPhoto(params: LogFoodPhotoParams): Promise<FoodLogResult> {
    const res = await this.client.request<SingleResponse<FoodLogResult>>('/foods/log/photo', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  }
}

class RecipeResource {
  constructor(private client: YMoveClient) {}

  async search(params?: SearchRecipesParams): Promise<ListResponse<Recipe>> {
    const query = toQuery(params);
    return this.client.request<ListResponse<Recipe>>(`/recipes/search${query}`);
  }

  async get(idOrSlug: string): Promise<Recipe> {
    const res = await this.client.request<SingleResponse<Recipe>>(`/recipes/${encodeURIComponent(idOrSlug)}`);
    return res.data;
  }

  async mealTypes(): Promise<MealTypeCount[]> {
    const res = await this.client.request<SingleResponse<MealTypeCount[]>>('/recipes/meal-types');
    return res.data;
  }

  async diets(): Promise<DietCount[]> {
    const res = await this.client.request<SingleResponse<DietCount[]>>('/recipes/diets');
    return res.data;
  }
}

// ── Helpers ────────────────────────────────────────────

function toQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}
