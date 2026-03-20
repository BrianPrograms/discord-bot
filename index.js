require("dotenv").config();

const { Client, GatewayIntentBits, Partials } = require("discord.js");
const OpenAI = require("openai");
const axios = require("axios");

// --------------------
// ENV LOGGING
// --------------------
console.log("[Startup] DISCORD_BOT_TOKEN present:", !!process.env.DISCORD_BOT_TOKEN);
console.log("[Startup] OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);
console.log("[Startup] SERPAPI_KEY present:", !!process.env.SERPAPI_KEY);

// --------------------
// DISCORD CLIENT
// --------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const token = process.env.DISCORD_BOT_TOKEN;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --------------------
// ERROR LOGGING
// --------------------
client.on("error", (err) => console.error("[Discord client error]", err));
client.on("warn", (info) => console.warn("[Discord warning]", info));
client.on("shardError", (err) => console.error("[Discord shard error]", err));

process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled rejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[Uncaught exception]", err);
});

// --------------------
// SLANG
// --------------------
const slangBaseReplies = {
  lol: "That statement has rendered me most amused.",
  bruh: "My good fellow, I am utterly astounded by your actions.",
  wow: "Such marvels leave me thoroughly astonished.",
  omg: "Gracious on the throne above, I can scarcely comprehend such happenings.",
  nah: "Regretfully, I must refuse your proposition.",
  huh: "Pray, could you elucidate the matter once more?",
  yikes: "I am thoroughly disquieted by the grievous spectacle before me.",
  fafo: "Do proceed with your folly and witness the ensuing consequences firsthand.",
  stfu: "I must implore you to exercise the noble art of silence forthwith.",
  ngl: "I confess, with utmost sincerity, that deceit eludes my present disposition.",
  idc: "Your revelation moves me not in the slightest degree.",
  fr: "Indeed, I speak with unembellished veracity.",
  lmao: "My amusement has reached a most ungovernable crescendo.",
  tbh: "In the spirit of unvarnished candor, permit me to speak plainly.",
  wtf: "What manner of ungodly absurdity is this before my eyes?",
  ikr: "Indeed, I too am painfully acquainted with this lamentable truth.",
  smh: "I find myself compelled to oscillate my cranium in silent disappointment.",
  lowk: "I shall admit this truth in a most subdued and understated manner."
};

const slangVariantCache = {};
const VARIANTS_PER_TERM = 8;

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function generateVariants(term, baseReply, count = VARIANTS_PER_TERM) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "You are a Discord bot with an overly formal, aristocratic, slightly dramatic, humorous tone. " +
            `Generate ${count} unique short reply variations for a slang trigger. ` +
            "Each reply must preserve the same meaning as the original. " +
            "Each reply must be one sentence only. " +
            "Each reply must be under 22 words. " +
            "Do not use emojis. " +
            "Do not number the responses. " +
            "Return ONLY a valid JSON array of strings."
        },
        {
          role: "user",
          content: `Slang trigger: ${term}\nBase reply: ${baseReply}`
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "[]";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`[Variant JSON parse error: ${term}]`, err, raw);
      parsed = [];
    }

    const cleaned = Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean)
      : [];

    const unique = [...new Set([baseReply, ...cleaned])];
    return shuffleArray(unique);
  } catch (err) {
    console.error(`[Variant generation error: ${term}]`, err);
    return [baseReply];
  }
}

async function getVariant(term) {
  const baseReply = slangBaseReplies[term];
  if (!baseReply) return "I find myself bereft of an appropriate reply.";

  if (!slangVariantCache[term] || slangVariantCache[term].length === 0) {
    slangVariantCache[term] = await generateVariants(term, baseReply);
    console.log(`[Cache refill] ${term}: ${slangVariantCache[term].length}`);
  }

  return slangVariantCache[term].pop() || baseReply;
}

// --------------------
// 67 TRIGGER
// --------------------
const sixtySevenTenors = [
  "https://tenor.com/view/cat-67-scp-67-funyuns-funny-gif-75413186200073602",
  "https://tenor.com/view/sixseven-six-seven-six-seve-67-gif-14143337669032958349",
  "https://tenor.com/view/nub-nub-cat-silly-cat-silly-cute-gif-18315508831080649878",
  "https://tenor.com/view/bosnov-67-bosnov-67-67-meme-gif-16727368109953357722"
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function containsSixtySeven(text = "") {
  const lower = text.toLowerCase();
  const patterns = [
    /\b67\b/,
    /\b6\s*7\b/,
    /\b6\s*,\s*7\b/,
    /\b6\s*\/\s*7\b/,
    /\b6\s*-\s*7\b/,
    /\b6\s*or\s*7\b/,
    /\b6\s*and\s*7\b/,
    /\bsix\s+seven\b/,
    /\bsix,\s*seven\b/,
    /\bsix\s*-\s*seven\b/,
    /\bsix\s*or\s*seven\b/,
    /\bsix\s*and\s*seven\b/,
    /\bsixty\s+seven\b/,
    /\bsixty-\s*seven\b/,
    /\bsixtyseven\b/,
    /\bsixseven\b/
  ];
  return patterns.some((r) => r.test(lower));
}

const slangPatterns = [
  { term: "lmao", regex: /\blmao\b/i },
  { term: "lol", regex: /\blol\b/i },
  { term: "bruh", regex: /\bbruh\b/i },
  { term: "wow", regex: /\bwow\b/i },
  { term: "omg", regex: /\bomg\b/i },
  { term: "nah", regex: /\bnah\b/i },
  { term: "huh", regex: /\bhuh\b/i },
  { term: "yikes", regex: /\byikes\b/i },
  { term: "fafo", regex: /\bfafo\b/i },
  { term: "stfu", regex: /\bstfu\b/i },
  { term: "ngl", regex: /\bngl\b/i },
  { term: "idc", regex: /\bidc\b/i },
  { term: "fr", regex: /\bfr\b/i },
  { term: "tbh", regex: /\btbh\b/i },
  { term: "wtf", regex: /\bwtf\b/i },
  { term: "ikr", regex: /\bikr\b/i },
  { term: "smh", regex: /\bsmh\b/i },
  { term: "lowk", regex: /\blowk\b/i }
];

// --------------------
// MEMORY + SEARCH
// --------------------
async function replyInChunks(message, text, chunkSize = 1900) {
  for (let i = 0; i < text.length; i += chunkSize) {
    await message.reply(text.slice(i, i + chunkSize));
  }
}

const userMemory = {};
const MAX_TURNS = 20;
const SUMMARY_TARGET = 500;

async function summarizeConversation(userId) {
  const history = userMemory[userId];
  if (!history || history.length <= MAX_TURNS) return;

  try {
    const summaryPrompt = [
      {
        role: "system",
        content: `Summarize the following conversation in under ${SUMMARY_TARGET} tokens. Keep important details, tasks, and facts, but remove filler. The summary should read like notes to remind the assistant of context.`
      },
      { role: "user", content: JSON.stringify(history) }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: summaryPrompt
    });

    const summaryText = completion.choices?.[0]?.message?.content?.trim() || "Summary unavailable.";

    const lastFew = history.slice(-5);
    userMemory[userId] = [
      { role: "system", content: "Conversation summary: " + summaryText },
      ...lastFew
    ];

    console.log(`[Memory] Summarized history for user ${userId}`);
  } catch (err) {
    console.error("[Memory error]", err);
  }
}

async function serpSearch(query) {
  try {
    const res = await axios.get("https://serpapi.com/search", {
      params: {
        q: query,
        api_key: process.env.SERPAPI_KEY,
        hl: "en",
        gl: "us"
      }
    });

    let results = [];
    if (res.data.organic_results) {
      for (const r of res.data.organic_results.slice(0, 5)) {
        results.push(`${r.title}: ${r.snippet} (${r.link})`);
      }
    }

    return results.join("\n") || "No results found.";
  } catch (err) {
    console.error("[SerpAPI error]", err.response?.data || err.message);
    return "Error fetching from SerpAPI.";
  }
}

function isSearchNeeded(text = "") {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/^[`"'“”‘’\s]+|[`"'“”‘’\s]+$/g, "")
    .replace(/\.$/, "");
  return normalized === "search_needed";
}

// --------------------
// READY
// --------------------
client.once("ready", async () => {
  console.log(`[Discord] Client initiated as ${client.user.username}`);
  console.log(`[Discord] Logged in as ${client.user.tag}`);
  console.log(`[Discord] Guild count: ${client.guilds.cache.size}`);

  for (const term of Object.keys(slangBaseReplies)) {
    try {
      slangVariantCache[term] = await generateVariants(term, slangBaseReplies[term]);
      console.log(`[Cache warmed] ${term}: ${slangVariantCache[term].length}`);
    } catch (err) {
      console.error(`[Cache warm error] ${term}`, err);
      slangVariantCache[term] = [slangBaseReplies[term]];
    }
  }
});

// --------------------
// MESSAGE HANDLER
// --------------------
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    const content = (message.content || "").trim();
    if (!content) return;

    if (containsSixtySeven(content)) {
      return message.channel.send(randomItem(sixtySevenTenors));
    }

    const match = content.match(/^\s*i(?:\s*(?:'|’)?\s*m|\s+am)\s+([^.,!?;:]+)/i);
    if (match) {
      const rest = match[1].trim();
      if (rest.length > 0) {
        return message.reply(`Hello ${rest}! I'm Dad.`);
      }
    }

    for (const { term, regex } of slangPatterns) {
      if (regex.test(content)) {
        const reply = await getVariant(term);
        return message.channel.send(reply);
      }
    }

    if (content.toLowerCase() === "test") {
      return message.reply("Test successful!");
    } else if (content.toLowerCase() === "!roll") {
      const roll = Math.floor(Math.random() * 6) + 1;
      return message.reply(`🎲 You rolled a ${roll}`);
    } else if (content.toLowerCase().startsWith("!ping")) {
      return message.reply("🏓 Pong!");
    } else if (content.toLowerCase().startsWith("!echo ")) {
      return message.reply(content.slice("!echo ".length));
    }

    if (content.toLowerCase().startsWith("!ask ")) {
      const userId = message.author.id;
      const userPrompt = content.slice("!ask ".length).trim();

      if (!userPrompt) {
        return message.reply("Ask me something like: `!ask how do I center a div?`");
      }

      if (!userMemory[userId]) userMemory[userId] = [];
      userMemory[userId].push({ role: "user", content: userPrompt });

      const context = [
        {
          role: "system",
          content:
            "You are a concise, helpful assistant in a Discord server. Keep answers short unless asked for detail. " +
            "If you are missing important or recent information, respond with exactly: search_needed",
        },
        ...userMemory[userId],
      ];

      await message.channel.sendTyping();

      let completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: context,
      });

      let answer = completion.choices?.[0]?.message?.content ?? "";

      if (isSearchNeeded(answer)) {
        const searchResults = await serpSearch(userPrompt);

        const secondContext = [
          {
            role: "system",
            content:
              "You now have real Google search results. Always use them to answer the user, and include relevant links in your reply. Do NOT reply with 'search_needed' in this turn.",
          },
          { role: "system", content: "Web results:\n" + searchResults },
          ...userMemory[userId].slice(-6),
          { role: "user", content: userPrompt },
        ];

        completion = await openai.chat.completions.create({
          model: "gpt-5",
          messages: secondContext,
        });

        answer = completion.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn’t find anything.";
      }

      await replyInChunks(message, answer);
      userMemory[userId].push({ role: "assistant", content: answer });

      if (userMemory[userId].length > MAX_TURNS) {
        await summarizeConversation(userId);
      }
    }
  } catch (err) {
    console.error("[messageCreate handler error]", err);
    try {
      await message.reply("Oops, I had trouble handling your request.");
    } catch (replyErr) {
      console.error("[Reply failure]", replyErr);
    }
  }
});

client.login(token).then(() => {
  console.log("[Login] client.login() resolved");
}).catch((err) => {
  console.error("[Login error]", err);
});