-- Create booking checklists table
CREATE TABLE public.booking_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_checklists ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Agents can view their own checklists"
ON public.booking_checklists
FOR SELECT
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can create their own checklists"
ON public.booking_checklists
FOR INSERT
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own checklists"
ON public.booking_checklists
FOR UPDATE
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own checklists"
ON public.booking_checklists
FOR DELETE
USING (auth.uid() = agent_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_booking_checklists_updated_at
BEFORE UPDATE ON public.booking_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();