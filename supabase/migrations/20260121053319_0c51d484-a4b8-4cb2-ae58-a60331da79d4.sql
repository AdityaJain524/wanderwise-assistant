-- Create feedback table for tracking AI response quality
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Agents can create their own feedback"
ON public.feedback
FOR INSERT
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can view their own feedback"
ON public.feedback
FOR SELECT
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own feedback"
ON public.feedback
FOR DELETE
USING (auth.uid() = agent_id);

-- Create index for faster queries
CREATE INDEX idx_feedback_agent_id ON public.feedback(agent_id);
CREATE INDEX idx_feedback_conversation_id ON public.feedback(conversation_id);