# ymove-exercise-api

Official SDK for the [YMove Exercise Video API](https://ymove.app/exercise-api) - 680+ HD exercise videos, workout generation, program builder, and AI posture analysis.

## Installation

```bash
npm install ymove-exercise-api
```

## Quick Start

```typescript
import { YMoveClient } from 'ymove-exercise-api';

const ymove = new YMoveClient('your_api_key');
// Get your API key at https://ymove.app/exercise-api/signup (free trial)

// List chest exercises with video
const { data: exercises } = await ymove.exercises.list({
  muscleGroup: 'chest',
  hasVideo: true,
});

// Get a single exercise by slug
const exercise = await ymove.exercises.get('dumbbell-bench-press');

// Generate a workout
const workout = await ymove.workouts.generate({
  muscleGroup: 'chest',
  difficulty: 'intermediate',
  exerciseCount: 6,
});

// Generate a 4-week training program
const program = await ymove.programs.generate({
  goal: 'muscle_building',
  daysPerWeek: 4,
  weeks: 4,
});

// Check usage
const usage = await ymove.getUsage();
```

## Exercises

### List exercises

```typescript
const { data, pagination } = await ymove.exercises.list({
  muscleGroup: 'chest',      // chest, back, shoulders, biceps, triceps, etc.
  equipment: 'dumbbell',      // machine, barbell, dumbbell, kettlebell, bodyweight, cable
  difficulty: 'intermediate', // beginner, intermediate, advanced
  exerciseType: 'strength',   // strength, yoga, stretching, cardio, etc.
  hasVideo: true,
  search: 'bench press',
  page: 1,
  pageSize: 20,
});
```

### Get single exercise

```typescript
const exercise = await ymove.exercises.get('barbell-squat');
console.log(exercise.title);           // "Barbell Squat"
console.log(exercise.videoUrl);        // MP4 URL
console.log(exercise.videoHlsUrl);     // HLS streaming URL
console.log(exercise.thumbnailUrl);    // Thumbnail image
console.log(exercise.instructions);    // Step-by-step instructions
console.log(exercise.secondaryMuscles); // Secondary muscles worked
```

### List muscle groups

```typescript
const groups = await ymove.exercises.muscleGroups();
// [{ slug: "chest", name: "Chest", exerciseCount: 45 }, ...]
```

### List exercise types

```typescript
const types = await ymove.exercises.exerciseTypes();
// [{ slug: "strength", name: "Strength", exerciseCount: 380 }, ...]
```

## Workouts

```typescript
const workout = await ymove.workouts.generate({
  muscleGroup: 'back',
  difficulty: 'advanced',
  exerciseCount: 8,
});

console.log(workout.name);             // "Advanced Back Workout"
console.log(workout.estimatedMinutes); // 55
workout.exercises.forEach(ex => {
  console.log(`${ex.exercise.title}: ${ex.sets}x${ex.reps} (${ex.restSeconds}s rest)`);
});
```

## Programs

```typescript
const program = await ymove.programs.generate({
  goal: 'muscle_building', // muscle_building, weight_loss, strength, endurance
  daysPerWeek: 4,
  weeks: 4,               // 4, 8, or 12
  equipment: 'barbell',   // optional: limit to specific equipment
});

console.log(program.split);           // "Push/Pull/Legs/Upper"
program.weeklySchedule.forEach(day => {
  console.log(`${day.name}: ${day.exercises.length} exercises`);
});
```

## Posture Analysis

```typescript
import { readFileSync } from 'fs';

const imageBase64 = readFileSync('photo.jpg').toString('base64');
const analysis = await ymove.posture.analyze({
  images: [{ type: 'base64', data: imageBase64, media_type: 'image/jpeg' }],
  analysis_type: 'standing',
});

console.log(analysis.score);    // 0-100
console.log(analysis.summary);  // "Overall posture shows..."
analysis.issues.forEach(issue => {
  console.log(`${issue.area}: ${issue.severity} - ${issue.description}`);
  console.log('Corrective exercises:', issue.exercises.map(e => e.title));
});
```

## Error Handling

```typescript
import { YMoveClient, YMoveError } from 'ymove-exercise-api';

try {
  const exercise = await ymove.exercises.get('nonexistent');
} catch (err) {
  if (err instanceof YMoveError) {
    console.log(err.status);  // 404
    console.log(err.message); // "Exercise not found"
  }
}
```

## API Key

Get your free trial API key at [ymove.app/exercise-api/signup](https://ymove.app/exercise-api/signup) - no credit card required.

## Links

- [Documentation](https://ymove.app/exercise-api/docs)
- [OpenAPI Spec](https://exercise-api.ymove.app/api/v2/openapi.json)
- [Pricing](https://ymove.app/exercise-api/pricing)
