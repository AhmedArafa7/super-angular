// Social System — Proximity Chat + Emotes
export class SocialSystem {
    constructor() {
        this.messages = [];
        this.emotes = ['wave', 'dance', 'laugh', 'point', 'thumbsup', 'shrug', 'nod', 'bow'];
        this.chatHistory = [];
        this.maxMessages = 50;
    }

    sendText(text, sender = 'You') {
        const msg = { type: 'text', sender, text, time: Date.now() };
        this.messages.push(msg);
        this.chatHistory.push(msg);
        if (this.messages.length > this.maxMessages) this.messages.shift();
        return msg;
    }

    sendEmote(emote, sender = 'You') {
        if (!this.emotes.includes(emote)) return null;
        const msg = { type: 'emote', sender, emote, time: Date.now() };
        this.messages.push(msg);
        if (this.messages.length > this.maxMessages) this.messages.shift();
        return msg;
    }

    getRecent(count = 10) {
        return this.messages.slice(-count);
    }

    getEmotes() { return this.emotes; }
}
