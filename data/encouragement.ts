import { TierKey } from "./tiers";

/**
 * The sincere half of the receipt email.
 *
 * The app itself is a joke, so this section deliberately changes register: it
 * acknowledges the gag, then says something true. Written per tier rather than
 * as one generic block — a message about privilege lands very differently on
 * someone who had a cushion than on someone who had none, and a single shared
 * paragraph would ring false to both.
 *
 * House style: no hustle-culture clichés, no "you've got this!", no pretending
 * an unfair start is secretly a gift. Adult, specific, warm.
 */
export interface Encouragement {
  /** Honest interpretation of what the number actually measured. */
  reading: string;
  /** Tier-specific paragraphs of motivation. */
  paragraphs: string[];
}

export const ENCOURAGEMENT: Record<Exclude<TierKey, "undefined">, Encouragement> = {
  nepo81: {
    reading:
      "Your answers point to a life with real cushioning — the kind of help that tends to arrive before you have to ask for it. Not every door was opened for you, but very few were locked.",
    paragraphs: [
      "Here is the honest part: a head start is luck, not character. You did not earn where you began — nobody does. But that cuts both ways. It does not make your effort fake, and it does not mean you owe the world an apology for a starting line you did not choose.",
      "The real risk for people who start ahead is not guilt, it is drift. When nothing forces you to move, it is remarkably easy to spend ten very comfortable years going nowhere in particular. So choose something difficult on purpose. Build one thing that would still stand if the cushion vanished tomorrow — a skill, a business, a body of work that is yours on the merits.",
      "And open doors for other people, not just for yourself. You know better than most how much one introduction is worth. A safety net is only wasted if you never jump.",
    ],
  },

  nepo61: {
    reading:
      "You have had genuine advantages and you have also done genuine work. Both things are true, and the mix is more common than either extreme.",
    paragraphs: [
      "There is a habit worth dropping: quietly discounting your own effort because you know you had help. Support and work are not mutually exclusive. Someone can hand you a ladder and you still have to climb it.",
      "There is also a habit worth keeping honest: not rounding your story down to pure grind because that version tells better. The people who stay grounded long-term are the ones who can hold both facts at once without flinching — I was helped, and I worked.",
      "You are in a strong position precisely because you understand both sides. Use it. The most useful person in any room is the one who can see the ladder and the climb.",
    ],
  },

  balanced: {
    reading:
      "One foot in family backup, one foot in real hustle. Statistically this is the most crowded place to be, and it is a more interesting position than it sounds.",
    paragraphs: [
      "You have been the person who needed help and the person who gave it, sometimes in the same month. That teaches something neither extreme learns: that nobody's situation is permanent, and that the distance between comfortable and struggling is usually one bad quarter, not a personality type.",
      "Middle positions feel unglamorous because they lack a clean story. You cannot claim the self-made myth and you cannot coast. What you have instead is range — you can talk to anyone, and you know the actual price of things.",
      "Do not waste energy wishing you had started further along. Spend it on the compounding stuff: skills that get more valuable with time, people who tell you the truth, and money that stays invested long enough to matter.",
    ],
  },

  lapo21: {
    reading:
      "Mostly survival mode with occasional airbags. You have had help once or twice, and you have also carried long stretches entirely on your own.",
    paragraphs: [
      "Having a fallback you rarely use is different from having none, and it is also different from leaning on one. You have mostly done this yourself, and the occasional rescue does not erase that.",
      "The thing to guard against is exhaustion disguised as pride. Accepting help when it is offered is not a failure of character; refusing it on principle just makes the road longer for no prize at the end. Ask for what you need. The people who get far are usually the ones who got comfortable asking.",
      "What you have built without a reliable net is real, and you should count it honestly instead of waiting for some future milestone to make it official.",
    ],
  },

  lapo0: {
    reading:
      "No net, no cushion, and you are still standing. Whatever you have, you built without scaffolding.",
    paragraphs: [
      "Building without a safety net is a genuinely different skill from building with one. You know how to make a plan when there is no fallback, how to stretch money that should not stretch, and how to start over after a loss that would have ended somebody else. None of that fits on a CV, and all of it decides everything.",
      "Here is the part nobody says plainly: starting behind means you have to be better to reach the same place, and that is unfair. Do not let anyone sell that back to you as character-building. It is not a gift, it is a tax.",
      "But do not let it convince you the game is unwinnable either. Compounding does not check where you started — it only checks whether you kept going. Small consistent moves over years beat a good starting position squandered, and you already have the harder half of that equation: you know how to keep going.",
      "Be as patient with yourself as you would be with a friend running the same race in heavier shoes.",
    ],
  },
};

/**
 * Closing note sent to everyone, regardless of tier — the point the whole app
 * is quietly making.
 */
export const UNIVERSAL_CLOSE = [
  "Wherever you landed: a starting position is a fact about your past, not a verdict on your future. Nobody chose their first ten years.",
  "The people who do well across a whole life are rarely the ones who started furthest ahead. They are the ones who were still going long after it stopped being exciting — which is unglamorous, unpostable, and available to absolutely everyone.",
  "Progress that is slow is still progress. Most things that look like overnight success are just somebody refusing to quit in public. Take care of yourself, be kind to the people around you, and keep moving at your own pace.",
];
