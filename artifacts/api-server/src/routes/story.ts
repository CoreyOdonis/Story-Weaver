import { Router } from "express";
import { GenerateStoryBody } from "@workspace/api-zod";

const router = Router();

const mockStories: Record<string, { title: string; story: string; emoji: string }[]> = {
  dinosaurs: [
    {
      title: "Dino Dreams",
      emoji: "🦕",
      story: `Once upon a time, a gentle brachiosaurus named Bruno lived in a lush green valley where the ferns grew taller than the clouds. Every evening, Bruno would stretch his long neck up to the stars and count them one by one, until his eyes grew heavy and he drifted off to sleep.

One night, Bruno discovered a tiny shooting star that had fallen into the valley. The little star was scared and couldn't find its way home. "Don't worry," said Bruno kindly, "I'll help you." He curled his long neck into a slide, and the little star zoomed up, up, up — back into the sky where it sparkled brighter than ever.

From that night on, whenever you see the brightest star in the sky, that's the one Bruno helped home. And somewhere in the valley below, Bruno the brachiosaurus is smiling and drifting off to sleep, dreaming of stars.

Sweet dreams!`,
    },
  ],
  space: [
    {
      title: "A Journey to the Moon",
      emoji: "🚀",
      story: `High above the clouds, where the sky turns from blue to black, there lived a little astronaut in a silver rocket ship. Every night, they traveled to the Moon to visit their best friend — a glowing moonbeam named Luna.

Luna would light up the whole sky just to say hello, painting silver ribbons across the darkness. Together, they would float among the stars, playing hopscotch on the Milky Way and making wishes on every comet that zoomed past.

When it was time to go home, Luna would guide the little astronaut safely back to Earth, shining through the bedroom window like a soft nightlight. "Goodnight, little explorer," Luna would whisper. "The stars will watch over you while you sleep."

And they always did. Sweet dreams!`,
    },
  ],
  princess: [
    {
      title: "The Princess of Dreams",
      emoji: "👑",
      story: `In a castle made of cotton candy clouds, there lived a princess who had a very special gift — whenever she closed her eyes, she could enter anyone's dream and make it wonderful.

Every night, she would put on her moonlight slippers and her crown of fireflies, and tiptoe through the dreamland. She sprinkled stardust on sad dreams to turn them into happy ones, and painted rainbows over stormy skies.

One night, she found a dream that was a little bit lonely — and that was YOUR dream. So she planted a magical garden right in the middle of it, full of singing flowers and friendly dragons and treasure chests full of laughter.

She smiled and whispered, "Sweet dreams are waiting for you." And she was right. Sweet dreams!`,
    },
  ],
  animals: [
    {
      title: "The Sleepy Animal Parade",
      emoji: "🐨",
      story: `As the sun set over the meadow, all the animals began their bedtime parade. First came the yawning lion, his great mane fluffed up like a pillow. Then waddled the sleepy penguin, already wearing his tuxedo pajamas.

The elephant lumbered past, spraying a gentle mist of water as a goodnight kiss. The giraffe stretched its long neck to nuzzle the clouds. The bunny hopped by so fast you could barely see her — she was always first in bed!

Last of all came the tiny firefly, lighting the path home for everyone. "Goodnight, meadow," she blinked. "Goodnight, trees. Goodnight, little one watching from your window."

And one by one, all the animals closed their eyes, and the meadow grew quiet and peaceful and soft. Just like you, drifting off to sleep right now. Sweet dreams!`,
    },
  ],
  cars: [
    {
      title: "Racing to Dreamland",
      emoji: "🏎️",
      story: `In the magical land of Vroom, all the cars would race to a very special place every night — Dreamland! The track was made of moonbeams and the finish line was a rainbow that stretched across the whole sky.

Zoom the little red car was the fastest, but tonight something wonderful happened. Zoom stopped to help a tiny blue car who had a flat tire. Together, they fixed it up and roared down the track, side by side.

They crossed the rainbow together, and the crowd of stars cheered so loudly that the whole sky shimmered with light. The winner of the race was announced — not the fastest car, but the kindest one.

As the engines grew quiet and the stars blinked goodnight, Zoom parked in the softest cloud and drifted off to sleep, dreaming of tomorrow's adventure. Sweet dreams!`,
    },
  ],
  magic: [
    {
      title: "The Magic Wishing Star",
      emoji: "✨",
      story: `Deep in the Enchanted Forest, there was a magic wishing star that only appeared at bedtime. Every night, it would drift down from the sky and land softly on the tallest tree, waiting for one very special child to make a wish.

A little wizard found the star one evening, glowing golden between the branches. "I wish," said the wizard carefully, "for everyone I love to have wonderful dreams tonight."

The star sparkled and swirled, sending tiny glowing wishes to every bedroom window in the land. Dreams filled with laughter and adventure and warmth wrapped around everyone like a soft, warm blanket.

The star winked at the little wizard. "Well done," it whispered. "The best wishes are the ones we make for others." Then it floated back into the sky, shining all night long.

Close your eyes and let the magic in. Sweet dreams!`,
    },
  ],
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMockStory(childName: string, interests: string[]): { title: string; story: string; emoji: string } {
  const interest = interests.length > 0 ? interests[Math.floor(Math.random() * interests.length)] : "magic";
  const stories = mockStories[interest] ?? mockStories.magic;
  const template = getRandomElement(stories);

  const personalizedStory = template.story.replace(/the little (astronaut|wizard|car|princess)/gi, `little ${childName}`);

  return {
    title: `${childName}'s ${template.title}`,
    story: personalizedStory,
    emoji: template.emoji,
  };
}

router.post("/generate-story", (req, res) => {
  const result = GenerateStoryBody.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error.message });
    return;
  }

  const { childName, interests } = result.data;
  const story = getMockStory(childName, interests);

  res.json(story);
});

export default router;
