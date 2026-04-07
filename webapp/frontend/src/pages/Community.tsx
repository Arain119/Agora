import { useState, useEffect } from "react";
import { api } from '../lib/api';
import { Card } from "../components/ui/Card";

export const Community = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [content, setContent] = useState("");
    const [postType, setPostType] = useState("prompt");

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await api.get('/community/posts');
            setPosts(res.data);
        } catch (e) {
            console.error("Failed to fetch posts", e);
        }
    };

    const handlePost = async () => {
        if (!content.trim()) return;
        try {
            await api.post('/community/posts', { type: postType, content });
            setContent("");
            fetchPosts();
        } catch (e) {
            console.error("Failed to create post", e);
        }
    };

    return (
        <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="border-b-4 border-text-primary pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight">Community</h1>
                    <p className="text-lg md:text-xl font-bold text-text-secondary mt-2">Share prompts & model reviews.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card variant="accent" className="sticky top-8">
                        <h2 className="text-2xl font-display font-black uppercase mb-6">Create Post</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">Type</label>
                                <select
                                    className="w-full bg-white border-4 border-text-primary p-3 rounded-geometric font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-1 focus:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all"
                                    value={postType}
                                    onChange={(e) => setPostType(e.target.value)}
                                >
                                    <option value="prompt">Prompt Share</option>
                                    <option value="review">Model Review</option>
                                    <option value="discussion">Discussion</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">Content</label>
                                <textarea
                                    className="w-full bg-white border-4 border-text-primary p-4 rounded-geometric font-medium shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-1 focus:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all min-h-[150px] resize-y"
                                    placeholder="What's on your mind?"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handlePost}
                                className="w-full bg-text-primary text-white font-bold uppercase p-4 rounded-geometric border-4 border-text-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-brand hover:text-text-primary hover:-translate-y-1 transition-all active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
                            >
                                Post to Community
                            </button>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {posts.length === 0 ? (
                        <Card className="text-center py-16">
                            <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-text-primary">
                                <svg className="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-display font-bold">No posts yet</h3>
                            <p className="text-text-secondary mt-2">Be the first to share something!</p>
                        </Card>
                    ) : (
                        posts.map(post => (
                            <Card key={post.id} className="relative group">
                                <div className="absolute top-0 right-0 bg-brand-accent px-3 py-1 border-l-4 border-b-4 border-text-primary rounded-bl-geometric font-bold text-xs uppercase">
                                    {post.type}
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-brand rounded-full border-2 border-text-primary flex items-center justify-center font-bold text-white">
                                        {post.authorName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <p className="font-bold">{post.authorName || 'Unknown'}</p>
                                        <p className="text-xs text-text-secondary">{new Date(post.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className="whitespace-pre-wrap font-medium leading-relaxed">{post.content}</p>
                                <div className="mt-6 flex items-center gap-4 pt-4 border-t-2 border-text-primary/10">
                                    <button className="flex items-center gap-2 font-bold text-sm hover:text-brand transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        {post.likes || 0}
                                    </button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
