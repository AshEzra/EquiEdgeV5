import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, MessageCircle, Instagram, Facebook, Linkedin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import equiLogo from "@/assets/equi-logo.png";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import ExpertSearch from "@/components/ExpertSearch";
import emojiFlags from 'emoji-flags';

// Type for expert data from Supabase
interface Expert {
  id: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  specialties: string[] | null;
  starting_price: number | null;
  location: string | null;
  profile_image_url: string | null;
  preview_image_url: string | null;
  is_expert: boolean;
  instagram_url?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  about?: string;
  social?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  videos?: Array<{ title: string; url: string }>;
  plans?: Array<{
    id: number;
    name: string;
    description: string;
    details: string;
    price: number;
    duration: string;
    spots: number;
  }>;
  home_country?: string | null; // Added home_country to the interface
}

const TABS_DESKTOP = ['About Me', 'Videos & Articles', 'Available Plans', "Why It's Valuable"];
const TABS_MOBILE = ['About', 'Media', 'Plans', 'Reviews'];

const ExpertProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('About Me');
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ is_expert: boolean } | null>(null);
  const isMobile = useIsMobile();

  // Fetch current user's profile to check if they're an expert
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_expert')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          setCurrentUserProfile(data);
        }
      } catch (err) {
        console.error('Error fetching current user profile:', err);
      }
    };
    
    fetchCurrentUserProfile();
  }, [user]);

  // Map tab keys to canonical values for switching between mobile/desktop
  const TAB_KEYS = ['about', 'media', 'plans', 'reviews'];
  // Map canonical keys to tab labels for each mode
  const tabLabels = isMobile ? TABS_MOBILE : TABS_DESKTOP;
  // Find the current tab key based on the activeTab label
  const currentTabKey = (() => {
    const idx = (isMobile ? TABS_MOBILE : TABS_DESKTOP).findIndex(l => l === activeTab);
    return idx !== -1 ? TAB_KEYS[idx] : TAB_KEYS[0];
  })();
  // When switching between mobile/desktop, update activeTab to preserve the correct tab
  useEffect(() => {
    const idx = TAB_KEYS.findIndex(k => k === currentTabKey);
    const newLabel = tabLabels[idx] || tabLabels[0];
    if (activeTab !== newLabel) setActiveTab(newLabel);
    // eslint-disable-next-line
  }, [isMobile]);

  // Fetch expert data from Supabase
  useEffect(() => {
    const fetchExpert = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        // Fetch expert profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .eq('is_expert', true)
          .single();
        if (error) {
          console.error('Error fetching expert:', error);
          setError('Expert not found');
          setLoading(false);
          return;
        }
        if (!data) {
          setError('Expert not found');
          setLoading(false);
          return;
        }
        // Fetch expert videos
        const { data: videosData, error: videosError } = await (supabase as any)
          .from('expert_videos')
          .select('url, created_at')
          .eq('expert_id', id)
          .order('created_at', { ascending: false });
        if (videosError) {
          console.error('Error fetching expert videos:', videosError);
        }
        // Fetch expert plans
        const { data: plansData, error: plansError } = await supabase
          .from('expert_services')
          .select('id, title, description, price, availability_slots')
          .eq('expert_id', id)
          .order('price', { ascending: true });
        if (plansError) {
          console.error('Error fetching expert plans:', plansError);
        }
        // Add default data for missing fields
        const expertData: Expert = {
          ...data,
          about: (data as any).profile_bio || `I am ${data.first_name} ${data.last_name}, an expert in equestrian sports.`,
          social: {
            instagram: data.instagram_url || null,
            facebook: data.facebook_url || null,
            linkedin: data.linkedin_url || null
          },
          videos: (videosData || []).map((v: any) => ({ url: v.url, title: '' })),
          plans: (plansData || []).map((p: any) => ({
            id: parseInt(p.id),
            name: p.title,
            description: p.description,
            price: p.price,
            spots: p.availability_slots,
            details: '',
            duration: '30 min' // Default duration
          }))
        };
        setExpert(expertData);
      } catch (err) {
        console.error('Error fetching expert:', err);
        setError('Failed to load expert');
      } finally {
        setLoading(false);
      }
    };
    fetchExpert();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading expert profile...</p>
        </div>
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Expert not found</h1>
          <Button onClick={() => navigate('/experts')}>
            Back to Experts
          </Button>
        </div>
      </div>
    );
  }

  // Helper function to get expert's full name
  const getExpertName = (expert: Expert) => {
    const firstName = expert.first_name || '';
    const lastName = expert.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown Expert';
  };

  // Helper function to get expert's display image
  const getExpertImage = (expert: Expert) => {
    const profileImageUrl = expert.profile_image_url;
    
    if (!profileImageUrl) {
      return '/placeholder.svg';
    }
    
    // If it's already a full URL, use it
    if (profileImageUrl.startsWith('http')) {
      return profileImageUrl;
    }
    
    // If it's a relative path, assume it's from Supabase storage
    if (profileImageUrl.startsWith('/')) {
      return profileImageUrl;
    }
    
    // Default fallback
    return '/placeholder.svg';
  };

  const handleBookPlan = async (planId: number) => {
    try {
      toast({
        title: "Booking Initiated",
        description: "Creating your session...",
      });

      // In a real app, this would integrate with Stripe first
      // For now, we'll simulate the booking process
      
      // Get the plan details
      const plan = expert.plans?.find(p => p.id === planId);
      if (!plan) {
        toast({
          title: "Error",
          description: "Plan not found",
          variant: "destructive",
        });
        return;
      }

      // Simulate payment success and create booking
      setTimeout(async () => {
        try {
          // This would be the actual booking creation
          // const sessionInfo = await SessionService.createBooking({
          //   user_id: user?.id || '',
          //   expert_id: expert.id,
          //   service_id: planId.toString(),
          //   price_paid: plan.price * 100 // Convert to cents
          // });

          toast({
            title: "Session Started!",
            description: "Your session is now active. You can start chatting with the expert.",
          });
          
          navigate('/messages');
        } catch (error) {
          toast({
            title: "Booking Failed",
            description: "There was an error creating your session. Please try again.",
            variant: "destructive",
          });
        }
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate booking",
        variant: "destructive",
      });
    }
  };

  // Update renderTabContent to use canonical tab keys
  const renderTabContent = () => {
    switch (currentTabKey) {
      case 'about':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Background</h3>
              <p className="text-muted-foreground whitespace-pre-line">
                {expert.about}
              </p>
            </div>
            {/* Removed Connect section */}
          </div>
        );
      case 'media':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground mb-4">Videos</h3>
            {expert.videos && expert.videos.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {expert.videos.map((video, index) => {
                  const getYouTubeId = (url) => {
                    const match = url.match(/(?:youtu.be\/|youtube.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                    return match ? match[1] : null;
                  };
                  const ytId = getYouTubeId(video.url);
                  return (
                    <div key={index} className="w-full flex flex-col items-center">
                      {ytId ? (
                        <iframe
                          width="98%"
                          height="210"
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="rounded-lg aspect-video"
                        ></iframe>
                      ) : (
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{video.url}</a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-center">No videos shared yet.</div>
            )}
          </div>
        );
      case 'plans':
        return (
          <div className="space-y-4 max-w-4xl mx-auto">
            {expert.plans?.map((plan, idx) => (
              <Card key={plan.id} className="border border-gray-200 shadow-sm bg-white">
                <CardContent className="py-4 px-4 md:py-3 md:px-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
                    {/* Left: Plan Info (60%) */}
                    <div className="md:w-[60%] w-full min-w-0 pr-0 md:pr-6">
                      <div className="mb-1">
                        <span className="inline-block text-xs font-semibold bg-black text-white rounded px-2 py-0.5 mb-1">
                          {idx === 0 ? 'Book a session' : `Select plan #${idx}`}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-0.5">
                        {plan.name}
                      </h3>
                      <div className="mb-1 text-xs text-muted-foreground font-medium">What's included:</div>
                      {/* Description as bullet points, full text visible */}
                      <ul className="mb-2 pl-4 space-y-0.5 text-muted-foreground text-xs list-disc">
                        {plan.description
                          ? plan.description.split(/\n|•|\-/).filter(Boolean).map((line, i) => (
                              <li key={i} className="whitespace-pre-line break-words">{line.trim()}</li>
                            ))
                          : <li>No description provided.</li>}
                      </ul>
                      <div className="flex items-center gap-3 mb-0.5">
                        <span className="text-lg font-bold text-foreground">${plan.price}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {plan.spots} spot{plan.spots !== 1 ? 's' : ''} remaining!
                      </div>
                    </div>
                    {/* Right: Book Button (40%) */}
                    <div className="md:w-[40%] w-full flex justify-center md:justify-end items-center mt-3 md:mt-0">
                      <Button 
                        onClick={() => handleBookPlan(plan.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-all"
                        style={{ width: 240, height: 42, minWidth: 200, minHeight: 38 }}
                      >
                        {idx === 0 ? 'Book Now' : 'Select'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case 'reviews':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground text-base">User reviews coming soon!</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background scrollbar-hide">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left - Logo */}
            <button 
              onClick={() => navigate('/experts')}
              className="flex items-center space-x-1.5 focus:outline-none"
            >
              <img src={equiLogo} alt="EquiEdge Logo" className="w-7 h-7 object-contain" />
              <span className="text-[1.01rem] font-normal tracking-tight text-gray-900 select-none">
                <span className="font-semibold">Equi</span><span className="font-extrabold" style={{ marginLeft: '1px' }}>Edge</span>
              </span>
            </button>
            
            {/* Center - Search (hidden on mobile) */}
            <div className="hidden sm:flex flex-1 justify-center max-w-md mx-8">
              <ExpertSearch 
                placeholder="Search experts"
                className="w-full"
              />
            </div>

            {/* Right - Messages and User Menu */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={() => navigate('/messages')}
                className="relative flex items-center justify-center p-0 bg-transparent border-0 focus:outline-none"
                style={{ minWidth: 30 }}
              >
                <span className="flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2.5" y="5.5" width="17" height="11" rx="1.5" fill="white" stroke="#1877F6" strokeWidth="1.7"/>
                    <path d="M4 7l7 5 7-5" stroke="#1877F6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </span>
              </button>
              <div className="h-8 w-px bg-gray-200 mx-1.5" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center space-x-0.5 cursor-pointer select-none">
                    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-black">
                      <span className="text-xs font-semibold text-white">
                        {user?.email?.charAt(0).toUpperCase()}
                      </span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {currentUserProfile?.is_expert && (
                    <DropdownMenuItem onClick={() => navigate('/manage-profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Manage Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-8 ${isMobile ? 'mt-6' : 'mt-16'}`}>
        {/* Expert Header */}
        {isMobile ? (
          <div className="flex flex-col items-center mb-10">
            {/* Profile image top and center, larger and less top padding */}
            <div className="w-36 h-36 bg-muted rounded-full flex items-center justify-center overflow-hidden mb-5 mt-2">
              {getExpertImage(expert) ? (
                <img
                  src={getExpertImage(expert)}
                  alt={getExpertName(expert)}
                  className="w-full h-full object-cover rounded-full"
                  onError={e => { (e.target as HTMLImageElement).src = '/api/placeholder/400/400'; }}
                />
              ) : (
                <span className="text-2xl font-bold">
                  {getExpertName(expert).split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
            {/* Flag and location left aligned */}
            <div className="w-full flex items-center gap-2 mb-1">
              {expert.home_country ? (
                <span className="text-2xl">
                  {emojiFlags.countryCode(expert.home_country)?.emoji || ''}
                </span>
              ) : null}
              <span className="text-muted-foreground text-sm">Based in {expert.location || 'Unknown location'}</span>
            </div>
            {/* Name left aligned */}
            <h1 className="w-full text-2xl font-bold text-foreground mb-2 text-left">
              {getExpertName(expert)}
            </h1>
            {/* Social icons left aligned */}
            <div className="w-full flex items-center gap-4 mb-2">
              {(expert.social?.facebook || expert.facebook_url) && (
                <a 
                  href={expert.social?.facebook || expert.facebook_url || ''} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-foreground transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {(expert.social?.linkedin || expert.linkedin_url) && (
                <a 
                  href={expert.social?.linkedin || expert.linkedin_url || ''} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {(expert.social?.instagram || expert.instagram_url) && (
                <a 
                  href={expert.social?.instagram || expert.instagram_url || ''} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-foreground transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ) : (
          // ... existing desktop layout ...
          <div className="flex items-start gap-6 mb-20">
            <div className="w-28 h-28 bg-muted rounded-full flex items-center justify-center overflow-hidden">
              {getExpertImage(expert) ? (
                <img
                  src={getExpertImage(expert)}
                  alt={getExpertName(expert)}
                  className="w-full h-full object-cover rounded-full"
                  onError={e => { (e.target as HTMLImageElement).src = '/api/placeholder/400/400'; }}
                />
              ) : (
                <span className="text-2xl font-bold">
                  {getExpertName(expert).split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {expert.home_country ? (
                  <span className="text-2xl">
                    {emojiFlags.countryCode(expert.home_country)?.emoji || ''}
                  </span>
                ) : null}
                <span className="text-muted-foreground text-sm">
                  Based in {expert.location || 'Unknown location'}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {getExpertName(expert)}
              </h1>
              {/* Social Links - Check both social object and direct URL fields */}
              {(expert.social?.instagram || expert.social?.facebook || expert.social?.linkedin || 
                expert.instagram_url || expert.facebook_url || expert.linkedin_url) ? (
                <div className="flex items-center gap-3 mt-2">
                  {(expert.social?.instagram || expert.instagram_url) && (
                    <a 
                      href={expert.social?.instagram || expert.instagram_url || ''} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gray-400 hover:text-foreground transition-colors"
                    >
                      <Instagram className="h-3 w-3" />
                    </a>
                  )}
                  {(expert.social?.facebook || expert.facebook_url) && (
                    <a 
                      href={expert.social?.facebook || expert.facebook_url || ''} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gray-400 hover:text-foreground transition-colors"
                    >
                      <Facebook className="h-3 w-3" />
                    </a>
                  )}
                  {(expert.social?.linkedin || expert.linkedin_url) && (
                    <a 
                      href={expert.social?.linkedin || expert.linkedin_url || ''} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gray-400 hover:text-foreground transition-colors"
                    >
                      <Linkedin className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {expert.specialties?.map((specialty) => (
                    <Badge key={specialty} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-black text-white mb-8 ${isMobile ? 'py-2' : ''}`} style={isMobile ? { minHeight: 36 } : {}}>
          <div className="flex max-w-4xl mx-auto relative px-8">
            <div className={`flex ${isMobile ? 'gap-x-6' : 'gap-x-10'}`}>
              {tabLabels.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${isMobile ? 'px-1.5 py-1' : 'px-4 py-3'} text-sm transition-colors relative focus:outline-none ${
                    activeTab === tab
                      ? 'text-white font-bold'
                      : 'text-white font-normal hover:bg-gray-800'
                  }`}
                  style={{ zIndex: 1 }}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Only show the bottom border line on desktop */}
            {!isMobile && (
              <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-700 w-full" style={{ zIndex: 0 }} />
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default ExpertProfile;