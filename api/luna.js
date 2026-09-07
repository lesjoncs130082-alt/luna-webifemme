// Fonction serveur (Vercel) : recoit le prompt + le moteur choisi ("claude" ou "openai")
// depuis la page Luna, verifie le code d'acces equipe, appelle le bon fournisseur avec la
// cle secrete correspondante (jamais visible cote client), renvoie le texte.
export default async function handler(req, res) {
    if (req.method !== "POST") {
          res.status(405).json({ error: "Methode non autorisee." });
          return;
    }

  const { prompt, moteur, codeAcces } = req.body || {};

  const codeAttendu = process.env.LUNA_ACCESS_CODE;
    if (codeAttendu && codeAcces !== codeAttendu) {
          res.status(401).json({ error: "Code d'acces incorrect. Cet outil est reserve a l'equipe WebiFemme." });
          return;
    }

  if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ error: "Le message envoye a Luna est vide ou invalide." });
        return;
  }

  const moteurChoisi = moteur === "openai" ? "openai" : "claude";

  try {
        const texte =
                moteurChoisi === "openai"
            ? await appellerOpenAI(prompt)
                  : await appellerClaude(prompt);
        res.status(200).json({ texte, moteur: moteurChoisi });
  } catch (err) {
        res.status(err.status || 500).json({ error: err.message || String(err) });
  }
}

async function appellerClaude(prompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
          const e = new Error(
                  "Cle Claude manquante cote serveur. Dans Vercel : Settings > Environment Variables > ajouter ANTHROPIC_API_KEY, puis redeployer."
                );
          e.status = 500;
          throw e;
    }

  const reponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
                model: "claude-sonnet-5",
                max_tokens: 4096,
                messages: [{ role: "user", content: prompt }],
        }),
  });

  if (!reponse.ok) {
        const detail = await reponse.text();
        const e = new Error("Erreur cote Claude : " + detail);
        e.status = 502;
        throw e;
  }

  const data = await reponse.json();
    return (data.content || []).map((bloc) => bloc.text || "").join("");
}

async function appellerOpenAI(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
          const e = new Error(
                  "Cle ChatGPT manquante cote serveur. Dans Vercel : Settings > Environment Variables > ajouter OPENAI_API_KEY, puis redeployer."
                );
          e.status = 500;
          throw e;
    }

  const reponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
                "content-type": "application/json",
                authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify({
                model: "gpt-5.4-mini",
                max_tokens: 4096,
                messages: [{ role: "user", content: prompt }],
        }),
  });

  if (!reponse.ok) {
        const detail = await reponse.text();
        const e = new Error("Erreur cote ChatGPT : " + detail);
        e.status = 502;
        throw e;
  }

  const data = await reponse.json();
    return data.choices?.[0]?.message?.content || "";
}
