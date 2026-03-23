require("dotenv").config();

const { Client, GatewayIntentBits, Partials } = require("discord.js");
const OpenAI = require("openai");
const axios = require("axios");

console.log("[Startup] DISCORD_BOT_TOKEN present:", !!process.env.DISCORD_BOT_TOKEN);
console.log("[Startup] OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);
console.log("[Startup] SERPAPI_KEY present:", !!process.env.SERPAPI_KEY);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message]
});

const token = process.env.DISCORD_BOT_TOKEN;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

client.on("error", function (err) {
  console.error("[Discord client error]", err);
});

client.on("warn", function (info) {
  console.warn("[Discord warning]", info);
});

client.on("shardError", function (err) {
  console.error("[Discord shard error]", err);
});

process.on("unhandledRejection", function (reason) {
  console.error("[Unhandled rejection]", reason);
});

process.on("uncaughtException", function (err) {
  console.error("[Uncaught exception]", err);
});

const sixtySevenTenors = [
  "https://tenor.com/ecUoBs2k3YQ.gif",
  "https://tenor.com/q0WNC9BA9Cr.gif",
  "https://tenor.com/6ztZ4qv7oX.gif",
  "https://tenor.com/t5PGB8YJaQM.gif",
  "https://tenor.com/qHKanqrTdUm.gif",
  "https://tenor.com/ehldEDLdfrF.gif",
  "https://tenor.com/fRF2bMR4rFG.gif",
  "https://tenor.com/uPLqSij9pKo.gif",
  "https://tenor.com/gCKCmFqqO2q.gif",
  "https://tenor.com/d9Asl0NPkvp.gif",
  "https://tenor.com/ldYgbZKRlr4.gif",
  "https://tenor.com/gzNLZCiMWRe.gif",
  "https://tenor.com/qmWsC7lUdfj.gif",
  "https://tenor.com/mMuG95keAmU.gif",
  "https://tenor.com/jx3n6J7zl5i.gif",
  "https://tenor.com/h24pKY5HZ1N.gif",
  "https://tenor.com/g0exGauI9hH.gif",
  "https://tenor.com/cLQYrY4wk9h.gif",
  "https://tenor.com/skEpe7lQI0T.gif",
  "https://tenor.com/ej3ZE5RYKzV.gif",
  "https://tenor.com/oWvtx1fMDEU.gif"
];

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

const userMemory = {};
const MAX_TURNS = 20;
const SUMMARY_TARGET = 500;

const guildStyleMemory = {};
const MAX_STYLE_MESSAGES = 200;

const guildRecentGifMemory = {};
const MAX_GIF_MESSAGES = 100;
const RANDOM_GIF_REPLY_PROBABILITY = 0.2;

const randomReplyCooldowns = new Map();
const RANDOM_REPLY_COOLDOWN_MS = 3 * 60 * 1000;
const RANDOM_REPLY_PROBABILITY = 0.025;

const slangReplyCooldowns = new Map();
const SLANG_REPLY_COOLDOWN_MS = 2 * 60 * 1000;
const SLANG_REPLY_PROBABILITY = 0.35;
const SLANG_OPPOSITE_REACTION_PROBABILITY = 0.25;

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function randomDelay(min, max) {
  const low = typeof min === "number" ? min : 700;
  const high = typeof max === "number" ? max : 1800;
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function humanDelay(text, min, max) {
  const value = typeof text === "string" ? text : "";
  const low = typeof min === "number" ? min : 600;
  const high = typeof max === "number" ? max : 2200;
  const estimated = 500 + value.length * 18;
  return Math.max(low, Math.min(high, estimated));
}

function containsSixtySeven(text) {
  const lower = (text || "").toLowerCase();
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
  return patterns.some(function (r) {
    return r.test(lower);
  });
}

function isSearchNeeded(text) {
  const normalised = (text || "")
    .trim()
    .toLowerCase()
    .replace(/^[`"'“”‘’\s]+|[`"'“”‘’\s]+$/g, "")
    .replace(/\.$/, "");
  return normalised === "search_needed";
}

function isNormalChatMessage(content) {
  const trimmed = (content || "").trim();
  if (!trimmed) return false;
  if (!/^[a-zA-Z]/.test(trimmed)) return false;
  if (/^[!/$?]/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^```/.test(trimmed)) return false;
  if (trimmed.length < 2) return false;
  return true;
}

function addToGuildStyleMemory(guildId, message) {
  if (!guildId) return;

  if (!guildStyleMemory[guildId]) {
    guildStyleMemory[guildId] = [];
  }

  guildStyleMemory[guildId].push({
    content: message.content.trim(),
    authorId: message.author.id,
    channelId: message.channel.id,
    timestamp: Date.now()
  });

  if (guildStyleMemory[guildId].length > MAX_STYLE_MESSAGES) {
    guildStyleMemory[guildId].shift();
  }
}

function canRandomReplyInChannel(channelId) {
  const last = randomReplyCooldowns.get(channelId) || 0;
  return Date.now() - last >= RANDOM_REPLY_COOLDOWN_MS;
}

function markRandomReply(channelId) {
  randomReplyCooldowns.set(channelId, Date.now());
}

function shouldRandomlyReply(probability) {
  const chance = typeof probability === "number" ? probability : RANDOM_REPLY_PROBABILITY;
  return Math.random() < chance;
}

function canSlangReplyInChannel(channelId) {
  const last = slangReplyCooldowns.get(channelId) || 0;
  return Date.now() - last >= SLANG_REPLY_COOLDOWN_MS;
}

function markSlangReply(channelId) {
  slangReplyCooldowns.set(channelId, Date.now());
}

function shouldReplyToSlang() {
  return Math.random() < SLANG_REPLY_PROBABILITY;
}

function isTenorPageUrl(url) {
  return typeof url === "string" && /https?:\/\/tenor\.com\/view\//i.test(url);
}

function isGifImageUrl(url) {
  return typeof url === "string" && /\.gif($|\?)/i.test(url);
}

function isGifLikeUrl(url) {
  if (!url) return false;

  return (
    isTenorPageUrl(url) ||
    isGifImageUrl(url) ||
    /giphy\.com/i.test(url) ||
    /media\d*\.giphy\./i.test(url) ||
    /media\d*\.tenor\./i.test(url)
  );
}

function addGifToGuildMemory(guildId, url) {
  if (!guildId || !url) return;

  if (!guildRecentGifMemory[guildId]) {
    guildRecentGifMemory[guildId] = [];
  }

  guildRecentGifMemory[guildId].push({
    url: url,
    timestamp: Date.now()
  });

  if (guildRecentGifMemory[guildId].length > MAX_GIF_MESSAGES) {
    guildRecentGifMemory[guildId].shift();
  }
}

function getRandomRecentGif(guildId) {
  const gifs = guildRecentGifMemory[guildId] || [];
  if (gifs.length === 0) return null;
  return randomItem(gifs).url;
}

function extractGifUrlsFromMessage(message) {
  const preferred = [];
  const fallback = [];

  for (const attachment of message.attachments.values()) {
    if (!attachment.url) continue;

    if (isTenorPageUrl(attachment.url) || isGifImageUrl(attachment.url)) {
      preferred.push(attachment.url);
    } else if (isGifLikeUrl(attachment.url)) {
      fallback.push(attachment.url);
    }
  }

  for (const embed of message.embeds) {
    if (embed.url) {
      if (isTenorPageUrl(embed.url) || isGifImageUrl(embed.url)) {
        preferred.push(embed.url);
      } else if (isGifLikeUrl(embed.url)) {
        fallback.push(embed.url);
      }
    }

    if (embed.image && embed.image.url) {
      if (isGifImageUrl(embed.image.url)) {
        preferred.push(embed.image.url);
      } else if (isGifLikeUrl(embed.image.url)) {
        fallback.push(embed.image.url);
      }
    }

    if (embed.thumbnail && embed.thumbnail.url) {
      if (isGifImageUrl(embed.thumbnail.url)) {
        preferred.push(embed.thumbnail.url);
      } else if (isGifLikeUrl(embed.thumbnail.url)) {
        fallback.push(embed.thumbnail.url);
      }
    }

    if (embed.video && embed.video.url) {
      if (isGifImageUrl(embed.video.url)) {
        preferred.push(embed.video.url);
      } else if (isGifLikeUrl(embed.video.url)) {
        fallback.push(embed.video.url);
      }
    }
  }

  return Array.from(new Set(preferred.concat(fallback)));
}

async function replyInChunks(message, text, chunkSize) {
  const size = typeof chunkSize === "number" ? chunkSize : 1900;
  for (let i = 0; i < text.length; i += size) {
    await message.reply(text.slice(i, i + size));
  }
}

async function summariseConversation(userId) {
  const history = userMemory[userId];
  if (!history || history.length <= MAX_TURNS) return;

  try {
    const summaryPrompt = [
      {
        role: "system",
        content:
          "Summarise the following conversation in under " +
          String(SUMMARY_TARGET) +
          " tokens. Keep important details, tasks, and facts, but remove filler. " +
          "The summary should read like notes to remind the assistant of context."
      },
      { role: "user", content: JSON.stringify(history) }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: summaryPrompt
    });

    const summaryText =
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content
        ? completion.choices[0].message.content.trim()
        : "Summary unavailable.";

    const lastFew = history.slice(-5);
    userMemory[userId] = [{ role: "system", content: "Conversation summary: " + summaryText }].concat(lastFew);

    console.log("[Memory] Summarised history for user " + userId);
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

    const results = [];
    if (res.data && res.data.organic_results) {
      for (const r of res.data.organic_results.slice(0, 5)) {
        results.push(r.title + ": " + r.snippet + " (" + r.link + ")");
      }
    }

    return results.join("\n") || "No results found.";
  } catch (err) {
    console.error("[SerpAPI error]", err.response ? err.response.data : err.message);
    return "Error fetching from SerpAPI.";
  }
}

function summariseGuildStyle(guildId) {
  const memory = guildStyleMemory[guildId] || [];
  const sample = memory.slice(-30);

  if (sample.length === 0) {
    return "No strong style signal yet. Keep replies casual, short, and natural.";
  }

  let lowercaseCount = 0;
  let emojiCount = 0;
  let slangCount = 0;
  let shortCount = 0;
  let chaoticCount = 0;

  const slangRegex = /\b(lol|lmao|bruh|bro|fr|tbh|lowk|ngl|wtf|ikr|smh|nah|yikes|omg|idk|rn|af|sus|cap)\b/i;
  const emojiRegex = /[\p{Extended_Pictographic}]/gu;

  for (const entry of sample) {
    const text = entry.content.trim();
    if (!text) continue;

    if (text === text.toLowerCase()) {
      lowercaseCount += 1;
    }

    if (emojiRegex.test(text)) {
      emojiCount += 1;
    }

    if (slangRegex.test(text)) {
      slangCount += 1;
    }

    if (text.split(/\s+/).length <= 6) {
      shortCount += 1;
    }

    if (/[!?]{2,}|😭|💀|lmao|wtf|bro|nah/i.test(text)) {
      chaoticCount += 1;
    }
  }

  const total = sample.length;

  const lowercaseStyle = lowercaseCount / total >= 0.7 ? "mostly lowercase" : "mixed capitalisation";
  const emojiStyle = emojiCount / total >= 0.4 ? "emoji appears fairly often" : "emoji is used sparingly";
  const slangStyle = slangCount / total >= 0.35 ? "slang-heavy" : "not heavily slang-based";
  const lengthStyle = shortCount / total >= 0.6 ? "messages are usually short and blunt" : "messages are mixed in length";
  const chaosStyle = chaoticCount / total >= 0.35 ? "tone is slightly chaotic, joking, or reactive" : "tone is fairly restrained";

  return "Observed server style: " +
    lowercaseStyle + ", " +
    emojiStyle + ", " +
    slangStyle + ", " +
    lengthStyle + ", " +
    chaosStyle + ".";
}

async function generateContextualSlangReply(term, currentMessage, guildId, shouldContradict) {
  const memory = guildStyleMemory[guildId] || [];
  const recentExamples = memory
    .slice(-8)
    .map(function (m) {
      return "- " + m.content;
    })
    .join("\n");

  const styleSummary = summariseGuildStyle(guildId);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "You are casually reacting in a Discord server. " +
            "You are not explaining slang. You are joining the conversation like another person in the server."
        },
        {
          role: "system",
          content: styleSummary
        },
        {
          role: "system",
          content:
            "Closely mirror the recent examples for lowercase usage, slang density, punctuation, emoji frequency, brevity, and humour style. " +
            "Keep the reply short, usually 2 to 12 words, never more than 16 words. " +
            "Do not sound polished. Do not sound formal unless the server somehow is formal. " +
            "Do not mention being a bot or AI. " +
            "Return only the reply text."
        },
        {
          role: "system",
          content:
            "The user used the slang term '" + term + "' in reaction to something. " +
            "React to the situation itself, not to the word as a definition. " +
            (shouldContradict
              ? "Take the opposite or dissenting reaction in a natural way if it fits."
              : "Usually align with the implied reaction naturally.")
        },
        {
          role: "system",
          content: "Recent server style examples:\n" + (recentExamples || "- no examples available")
        },
        {
          role: "user",
          content: "Message containing the slang:\n" + currentMessage
        }
      ]
    });

    const text =
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content
        ? completion.choices[0].message.content.trim()
        : "";

    if (!text) return null;
    return text;
  } catch (err) {
    console.error("[Contextual slang reply error]", err);
    return null;
  }
}

async function generateRandomStyleReply(currentMessage, guildId) {
  const memory = guildStyleMemory[guildId] || [];
  const recentExamples = memory
    .slice(-8)
    .map(function (m) {
      return "- " + m.content;
    })
    .join("\n");

  const styleSummary = summariseGuildStyle(guildId);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "You are casually chiming into a Discord server. " +
            "Your reply must sound like it came from this specific server, not from a generic chatbot."
        },
        {
          role: "system",
          content: styleSummary
        },
        {
          role: "system",
          content:
            "Closely mirror the recent examples for lowercase usage, slang density, punctuation, emoji frequency, brevity, and humour style. " +
            "If the examples are dry, be dry. If they are blunt, be blunt. If they are chaotic, be slightly chaotic. " +
            "Keep the reply short, usually 3 to 12 words, never more than 18 words. " +
            "Do not explain anything. Do not narrate. Do not sound polished. Do not sound formal unless the examples are formal. " +
            "Do not mention being a bot or AI. " +
            "If the message is confusing, absurd, or out of context, a short confused reaction is acceptable. " +
            "Return only the reply text."
        },
        {
          role: "system",
          content: "Recent server style examples:\n" + (recentExamples || "- no examples available")
        },
        {
          role: "user",
          content: "Current message:\n" + currentMessage
        }
      ]
    });

    const text =
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content
        ? completion.choices[0].message.content.trim()
        : "";

    if (!text) return null;
    return text;
  } catch (err) {
    console.error("[Random style reply error]", err);
    return null;
  }
}

client.once("ready", async function () {
  console.log("[Discord] Client initiated as " + client.user.username);
  console.log("[Discord] Logged in as " + client.user.tag);
  console.log("[Discord] Guild count: " + String(client.guilds.cache.size));
});

client.on("messageCreate", async function (message) {
  try {
    if (message.author.bot) return;

    const content = (message.content || "").trim();
    if (!content) return;

    if (message.guild) {
      const gifUrls = extractGifUrlsFromMessage(message);
      for (const gifUrl of gifUrls) {
        addGifToGuildMemory(message.guild.id, gifUrl);
      }
    }

    const lower = content.toLowerCase();

    if (containsSixtySeven(content)) {
      const tenor = randomItem(sixtySevenTenors);
      await message.channel.sendTyping();
      await delay(randomDelay(800, 1600));
      await message.channel.send(tenor);
      return;
    }

    const match = content.match(/^\s*i(?:\s*(?:'|’)?\s*m|\s+am)\s+([^.,!?;:]+)/i);
    if (match) {
      const rest = match[1].trim();
      if (rest.length > 0) {
        const dadReply = "Hello " + rest + "! I'm Dad.";
        await message.channel.sendTyping();
        await delay(humanDelay(dadReply, 700, 1800));
        await message.channel.send(dadReply);
        return;
      }
    }

    for (const entry of slangPatterns) {
      if (entry.regex.test(content)) {
        if (message.guild && isNormalChatMessage(content)) {
          addToGuildStyleMemory(message.guild.id, message);
        }

        if (canSlangReplyInChannel(message.channel.id) && shouldReplyToSlang()) {
          const shouldContradict = Math.random() < SLANG_OPPOSITE_REACTION_PROBABILITY;
          const reply = await generateContextualSlangReply(
            entry.term,
            content,
            message.guild ? message.guild.id : null,
            shouldContradict
          );

          if (reply) {
            await message.channel.sendTyping();
            await delay(humanDelay(reply, 700, 1800));
            await message.channel.send(reply);
            markSlangReply(message.channel.id);
            return;
          }
        }
        break;
      }
    }

    if (lower === "test") {
      await message.reply("Test successful!");
      return;
    }

    if (lower === "!roll") {
      const roll = Math.floor(Math.random() * 6) + 1;
      await message.reply("🎲 You rolled a " + String(roll));
      return;
    }

    if (lower.startsWith("!ping")) {
      await message.reply("🏓 Pong!");
      return;
    }

    if (lower.startsWith("!echo ")) {
      await message.reply(content.slice("!echo ".length));
      return;
    }

    if (lower.startsWith("!ask ")) {
      const userId = message.author.id;
      const userPrompt = content.slice("!ask ".length).trim();

      if (!userPrompt) {
        await message.reply("Ask me something like: !ask how do I center a div?");
        return;
      }

      if (!userMemory[userId]) userMemory[userId] = [];
      userMemory[userId].push({ role: "user", content: userPrompt });

      const context = [
        {
          role: "system",
          content:
            "You are a concise, helpful assistant in a Discord server. Keep answers short unless asked for detail. " +
            "If you are missing important or recent information, respond with exactly: search_needed"
        }
      ].concat(userMemory[userId]);

      await message.channel.sendTyping();

      let completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: context
      });

      let answer =
        completion.choices &&
        completion.choices[0] &&
        completion.choices[0].message &&
        completion.choices[0].message.content
          ? completion.choices[0].message.content
          : "";

      if (isSearchNeeded(answer)) {
        const searchResults = await serpSearch(userPrompt);

        const secondContext = [
          {
            role: "system",
            content:
              "You now have real Google search results. Always use them to answer the user, and include relevant links in your reply. Do NOT reply with search_needed in this turn."
          },
          { role: "system", content: "Web results:\n" + searchResults }
        ].concat(userMemory[userId].slice(-6)).concat([{ role: "user", content: userPrompt }]);

        completion = await openai.chat.completions.create({
          model: "gpt-5",
          messages: secondContext
        });

        answer =
          completion.choices &&
          completion.choices[0] &&
          completion.choices[0].message &&
          completion.choices[0].message.content
            ? completion.choices[0].message.content.trim()
            : "Sorry, I could not find anything.";
      }

      await replyInChunks(message, answer);
      userMemory[userId].push({ role: "assistant", content: answer });

      if (userMemory[userId].length > MAX_TURNS) {
        await summariseConversation(userId);
      }

      return;
    }

    if (message.guild && isNormalChatMessage(content)) {
      addToGuildStyleMemory(message.guild.id, message);

      if (canRandomReplyInChannel(message.channel.id) && shouldRandomlyReply(RANDOM_REPLY_PROBABILITY)) {
        const recentGif = getRandomRecentGif(message.guild.id);

        if (recentGif && Math.random() < RANDOM_GIF_REPLY_PROBABILITY) {
          await message.channel.sendTyping();
          await delay(randomDelay(900, 2200));
          await message.channel.send(recentGif);
          markRandomReply(message.channel.id);
          return;
        }

        const randomReply = await generateRandomStyleReply(content, message.guild.id);

        if (randomReply) {
          await message.channel.sendTyping();
          await delay(humanDelay(randomReply, 900, 2500));
          await message.channel.send(randomReply);
          markRandomReply(message.channel.id);
          return;
        }
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

client.login(token).then(function () {
  console.log("[Login] client.login() resolved");
}).catch(function (err) {
  console.error("[Login error]", err);
});