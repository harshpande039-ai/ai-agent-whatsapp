export const CLINIC_INFO = {
  name: "BrightSmile Dental Clinic",
  tagline: "Your Trusted 24/7 Dental AI Assistant",
  phone: "+91 98765 43210",
  whatsapp: "+91 98765 43210",
  address: "123 Main Street, New York, NY",
  hours: "Monday to Saturday from 9:00 AM to 7:00 PM IST. Closed on Sundays.",
  timezone: "Asia/Kolkata (IST)",
  doctors: [
    {
      id: "doc-1",
      name: "Dr. Sarah Jenkins",
      specialty: "General & Cosmetic Dentistry",
      experience: "12 years",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=250&q=80"
    },
    {
      id: "doc-2",
      name: "Dr. Aris Thorne",
      specialty: "Orthodontics & Invisalign",
      experience: "15 years",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=250&q=80"
    }
  ]
};

export const SERVICES = [
  { id: "consultation", name: "Dental Consultation", price: "Starts from $50", description: "Comprehensive dental evaluation and oral checkup." },
  { id: "cleaning", name: "Teeth Cleaning", price: "Evaluated at clinic", description: "Professional scaling and tooth polishing." },
  { id: "whitening", name: "Teeth Whitening", price: "Evaluated at clinic", description: "Professional teeth whitening treatment." },
  { id: "checkup", name: "Routine Checkup", price: "Starts from $50", description: "Preventative dental inspection." },
  { id: "fillings", name: "Dental Fillings", price: "Evaluated at clinic", description: "Treatment for cavities and damaged teeth." },
  { id: "rootcanal", name: "Root Canal Therapy", price: "Evaluated at clinic", description: "Painless root canal treatment." },
  { id: "extractions", name: "Tooth Extraction", price: "Evaluated at clinic", description: "Safe tooth removal when necessary." },
  { id: "implants", name: "Dental Implants", price: "Evaluated at clinic", description: "Permanent tooth replacement options." },
  { id: "braces", name: "Braces & Aligners", price: "Evaluated at clinic", description: "Orthodontic treatment for teeth alignment." }
];

export const INITIAL_FAQS = [
  {
    keywords: ["hours", "open", "timing", "schedule", "sunday", "saturday"],
    question: "What are your clinic hours?",
    answer: "Our clinic is open Monday to Saturday from 9:00 AM to 7:00 PM IST. We are closed on Sundays."
  },
  {
    keywords: ["location", "address", "where", "directions"],
    question: "Where is the dental clinic located?",
    answer: "Our clinic is located at 123 Main Street, New York, NY. Patients can contact us for directions."
  },
  {
    keywords: ["walk in", "walk-in", "need appointment"],
    question: "Do I need an appointment to visit the dentist?",
    answer: "Appointments are recommended, but we may accommodate walk-in patients depending on availability."
  },
  {
    keywords: ["how to book", "book an appointment", "ways to book"],
    question: "How can I book an appointment?",
    answer: "You can book an appointment by phone, through our website, or by contacting the clinic directly on WhatsApp."
  },
  {
    keywords: ["cancel", "cancellation"],
    question: "Can I cancel my appointment?",
    answer: "Yes. Please contact us as soon as possible if you need to cancel."
  },
  {
    keywords: ["reschedule", "change date", "change time"],
    question: "Can I reschedule my appointment?",
    answer: "Yes, appointments can be rescheduled based on availability."
  },
  {
    keywords: ["early", "arrive", "arrival"],
    question: "How early should I arrive for my appointment?",
    answer: "We recommend arriving about 10–15 minutes early."
  },
  {
    keywords: ["bring", "first appointment", "documents"],
    question: "What should I bring to my first appointment?",
    answer: "Please bring a valid ID, relevant medical information, and any previous dental records or X-rays if available."
  },
  {
    keywords: ["new patients", "accept new"],
    question: "Do you accept new patients?",
    answer: "Yes, we welcome new patients."
  },
  {
    keywords: ["children", "kids", "pediatric"],
    question: "Do you treat children?",
    answer: "Yes, we provide dental care for children and adults."
  },
  {
    keywords: ["services", "provide", "treatments offered"],
    question: "What dental services do you provide?",
    answer: "We provide general dentistry, teeth cleaning, fillings, crowns, root canals, extractions, dental implants, orthodontic treatments, and cosmetic dental services."
  },
  {
    keywords: ["teeth cleaning", "cleaning service"],
    question: "Do you provide teeth cleaning?",
    answer: "Yes, professional dental cleaning is available."
  },
  {
    keywords: ["cleaning frequency", "how often clean"],
    question: "How often should I get my teeth cleaned?",
    answer: "Most patients should have professional cleaning every six months, although your dentist may recommend a different schedule."
  },
  {
    keywords: ["dental checkups", "checkup"],
    question: "Do you provide dental checkups?",
    answer: "Yes, regular dental examinations are available."
  },
  {
    keywords: ["how often visit", "visit dentist"],
    question: "How often should I visit the dentist?",
    answer: "Most people should have a dental checkup approximately every six months."
  },
  {
    keywords: ["cavities", "cavity"],
    question: "Do you treat cavities?",
    answer: "Yes, cavities can usually be treated with dental fillings or other appropriate treatments."
  },
  {
    keywords: ["root canal", "root canals"],
    question: "Do you perform root canals?",
    answer: "Yes, root canal treatment is available when clinically appropriate."
  },
  {
    keywords: ["extractions", "pull tooth", "remove tooth"],
    question: "Do you perform tooth extractions?",
    answer: "Yes, tooth extractions are performed when necessary."
  },
  {
    keywords: ["wisdom tooth", "wisdom teeth"],
    question: "Do you provide wisdom tooth treatment?",
    answer: "Yes, we evaluate and treat wisdom tooth problems."
  },
  {
    keywords: ["implants", "dental implant"],
    question: "Do you offer dental implants?",
    answer: "Yes, dental implants may be available depending on the patient's dental condition."
  },
  {
    keywords: ["dentures", "false teeth"],
    question: "Do you provide dentures?",
    answer: "Yes, dentures may be provided for patients who need tooth replacement."
  },
  {
    keywords: ["whitening", "teeth whitening"],
    question: "Do you offer teeth whitening?",
    answer: "Yes, professional teeth-whitening treatments may be available."
  },
  {
    keywords: ["braces", "orthodontic"],
    question: "Do you provide braces?",
    answer: "Yes, orthodontic treatment options may be available."
  },
  {
    keywords: ["aligners", "invisalign", "clear aligner"],
    question: "Do you offer clear aligners?",
    answer: "Clear aligner treatment may be available following an orthodontic evaluation."
  },
  {
    keywords: ["sensitivity", "sensitive teeth"],
    question: "Do you treat tooth sensitivity?",
    answer: "Yes, the dentist can evaluate the cause of tooth sensitivity and recommend suitable treatment."
  },
  {
    keywords: ["toothache", "pain"],
    question: "What should I do if I have a toothache?",
    answer: "Contact the clinic to arrange an appointment. Severe or persistent tooth pain should be evaluated by a dentist."
  },
  {
    keywords: ["emergency", "emergencies"],
    question: "Do you treat dental emergencies?",
    answer: "Yes, we try to accommodate dental emergencies based on availability."
  },
  {
    keywords: ["knocked out", "fell out"],
    question: "What should I do if my tooth gets knocked out?",
    answer: "Contact a dentist immediately. A knocked-out permanent tooth requires urgent dental attention."
  },
  {
    keywords: ["break a tooth", "broken tooth"],
    question: "What should I do if I break a tooth?",
    answer: "Contact the clinic as soon as possible for an evaluation."
  },
  {
    keywords: ["bleeding gums", "bleed gums"],
    question: "Can you treat bleeding gums?",
    answer: "Yes, the dentist can evaluate bleeding gums and determine the appropriate treatment."
  },
  {
    keywords: ["gums bleed brush", "why bleed"],
    question: "Why do my gums bleed when I brush?",
    answer: "Bleeding gums can have several causes, including gum inflammation. A dental examination can help determine the cause."
  },
  {
    keywords: ["bad breath", "halitosis"],
    question: "Can dental problems cause bad breath?",
    answer: "Yes. Dental problems such as gum disease, cavities, and poor oral hygiene can contribute to bad breath."
  },
  {
    keywords: ["hurt", "painful treatment"],
    question: "Do dental treatments hurt?",
    answer: "Dentists use appropriate techniques and local anesthesia when needed to keep patients comfortable during treatment."
  },
  {
    keywords: ["anesthesia", "numb"],
    question: "Do you use local anesthesia?",
    answer: "Yes, local anesthesia can be used for many dental procedures when appropriate."
  },
  {
    keywords: ["how long take", "duration appointment"],
    question: "How long does a dental appointment take?",
    answer: "Appointment times vary depending on the examination or treatment required."
  },
  {
    keywords: ["cost", "how much cost", "treatment cost"],
    question: "How much does a dental treatment cost?",
    answer: "The cost depends on the treatment required. Consultation starts from $50. The clinic can provide an estimate after an examination."
  },
  {
    keywords: ["insurance", "accepted insurance"],
    question: "Do you accept insurance?",
    answer: "Insurance policies vary. Most major insurance providers are accepted. Please contact the clinic to confirm whether your specific insurance is accepted."
  },
  {
    keywords: ["payment plans", "installment", "emi"],
    question: "Do you offer payment plans?",
    answer: "Payment-plan availability depends on the treatment and clinic policy. Please contact the clinic for details."
  },
  {
    keywords: ["payment methods", "pay cash card upi"],
    question: "What payment methods do you accept?",
    answer: "We accept cash, card, UPI, and online payments. Please confirm with reception."
  },
  {
    keywords: ["estimates", "estimate before starting"],
    question: "Do you provide treatment estimates before starting?",
    answer: "Yes, treatment costs can generally be discussed before treatment begins."
  },
  {
    keywords: ["second opinion"],
    question: "Can I get a second opinion?",
    answer: "Yes, patients are welcome to seek a second professional opinion."
  },
  {
    keywords: ["x-ray", "xray"],
    question: "Do I need an X-ray?",
    answer: "Your dentist will recommend an X-ray if it is necessary for diagnosis or treatment planning."
  },
  {
    keywords: ["eat before", "can i eat"],
    question: "Can I eat before a dental appointment?",
    answer: "For most routine appointments, you can eat normally. Special procedures may have different instructions."
  },
  {
    keywords: ["brush before", "brush teeth before"],
    question: "Can I brush my teeth before my appointment?",
    answer: "Yes, you should maintain your normal oral hygiene routine."
  },
  {
    keywords: ["pregnant", "pregnancy"],
    question: "Can I visit the dentist while pregnant?",
    answer: "Tell your dentist if you are pregnant. The dentist will recommend appropriate and necessary treatment."
  },
  {
    keywords: ["after extraction", "post extraction"],
    question: "What should I do after a tooth extraction?",
    answer: "Follow the dentist's post-treatment instructions carefully and contact the clinic if you experience concerning symptoms."
  },
  {
    keywords: ["lose filling", "lost crown"],
    question: "What should I do if I lose a filling or crown?",
    answer: "Contact the clinic to arrange an appointment for evaluation and repair."
  },
  {
    keywords: ["advice over phone", "phone advice"],
    question: "Do you provide dental advice over the phone?",
    answer: "Our receptionist can provide general information, but diagnosis and treatment recommendations require assessment by a qualified dental professional."
  },
  {
    keywords: ["receptionist tell treatment", "receptionist diagnose"],
    question: "Can the receptionist tell me which treatment I need?",
    answer: "The receptionist can help schedule an appointment, but only a dentist can diagnose your condition and recommend treatment."
  },
  {
    keywords: ["appointment policy"],
    question: "What is your appointment policy?",
    answer: "Appointments are subject to availability and confirmation. Please contact us as soon as possible if you need to reschedule or cancel."
  }
];

export const INITIAL_APPOINTMENTS = [
  {
    id: "APT-1001",
    patientName: "Rahul Sharma",
    patientPhone: "+91 98765 11111",
    serviceName: "Dental Consultation",
    date: "2026-08-25",
    timeSlot: "10:00 AM",
    status: "Confirmed",
    isoDateTimeIST: "2026-08-25T10:00:00+05:30",
    createdAt: "2026-08-23T10:00:00Z"
  },
  {
    id: "APT-1002",
    patientName: "Priya Nair",
    patientPhone: "+91 98765 22222",
    serviceName: "Teeth Cleaning",
    date: "2026-08-25",
    timeSlot: "02:00 PM",
    status: "Confirmed",
    isoDateTimeIST: "2026-08-25T14:00:00+05:30",
    createdAt: "2026-08-23T11:30:00Z"
  }
];
