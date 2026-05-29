import React from 'react';
import { Mail, Phone, MapPin, Globe, Clock, MessageSquare } from 'lucide-react';

export function Contact() {
  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Contact Us</h2>
        <p className="text-muted-foreground mt-1">Get in touch with the OMSC Alumni Affairs Office</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Contact Info Cards */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
          <h3 className="font-bold text-lg text-foreground border-b border-border pb-3">Office Channels</h3>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</h4>
                <p className="text-sm font-semibold text-foreground mt-0.5">alumni.affairs@omsc.edu.ph</p>
                <p className="text-xs text-muted-foreground">General inquiries & tracer updates</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                <Phone size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Lines</h4>
                <p className="text-sm font-semibold text-foreground mt-0.5">+63 (043) 491-1436</p>
                <p className="text-xs text-muted-foreground">Office hours (Mon - Fri, 8:00 AM - 5:00 PM)</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                <Globe size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Official Website</h4>
                <a 
                  href="https://www.omsc.edu.ph" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm font-semibold text-primary hover:underline mt-0.5 block"
                >
                  www.omsc.edu.ph
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Address and Map Info */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
          <h3 className="font-bold text-lg text-foreground border-b border-border pb-3">Physical Address</h3>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Office Location</h4>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  OMSC Main Campus, Labangan, San Jose, Occidental Mindoro, Philippines, 5100
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Operating Hours</h4>
                <p className="text-sm font-semibold text-foreground mt-0.5">Monday to Friday</p>
                <p className="text-xs text-muted-foreground">8:00 AM – 12:00 PM | 1:00 PM – 5:00 PM</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Registrar Guidance Note */}
      <div className="bg-muted/40 border border-border rounded-xl p-5 flex gap-4">
        <MessageSquare className="text-primary shrink-0 mt-0.5" size={20} />
        <div className="space-y-1 text-sm text-foreground">
          <p className="font-bold">Need a Certificate or Transcript?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            For Registrar services, transcript of records (TOR), and certificates of graduation, please contact the Registrar Office directly at <span className="font-semibold text-foreground">registrar@omsc.edu.ph</span> or visit the main administrative building at Labangan Campus.
          </p>
        </div>
      </div>
    </div>
  );
}
