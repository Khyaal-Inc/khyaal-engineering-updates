// SHA-256 hash of 'khyaal-updates'
const EXPECTED_PASSWORD_HASH = 'a3377e9d5cf5fef520cdcd102f4107afc1bb7fb281b63ab92dabb1d5b9e80004';

// Sensitive data moved from index.html for security
// Source of truth for engineering updates
const UPDATE_DATA = {
    "metadata": {
        "title": "Khyaal Engineering Updates",
        "dateRange": "20th March - 27th March 2026",
        "description": "Executive Updates"
    },
    "tracks": [
        {
            "id": "platform",
            "name": "Khyaal Platform",
            "theme": "blue",
            "subtracks": [
                {
                    "name": "Website",
                    "items": [
                        {
                            "text": "Captcha implementation",
                            "status": "now",
                            "contributors": [
                                "Subhrajit"
                            ],
                            "note": "Adding a bot check on forms.",
                            "usecase": "Reduces spam and fake submissions.",
                            "id": "platform-website-0",
                            "startDate": "2026-03-20",
                            "due": "2026-03-27"
                        },
                        {
                            "id": "platform-website-1",
                            "text": "Rajkot event",
                            "status": "now",
                            "contributors": [
                                "Subhrajit",
                                "Vivek"
                            ],
                            "note": "Created a dedicated page for the event.",
                            "usecase": "Helps users register and access event details easily.",
                            "startDate": "2026-03-18",
                            "due": "2026-03-20",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "text": "Missing Pulse events tracking",
                            "status": "now",
                            "contributors": [
                                "Manish"
                            ],
                            "note": "Adding missing user activity tracking.",
                            "usecase": "Improves reporting and journey analysis.",
                            "id": "platform-website-2",
                            "startDate": "2026-03-20",
                            "due": "2026-03-27"
                        },
                        {
                            "id": "platform-website-3",
                            "text": "Legacy migration alerts and reporting",
                            "status": "next",
                            "contributors": [
                                "Subhrajit"
                            ],
                            "note": "Automating updates during migration work.",
                            "usecase": "Keeps teams informed with less manual work.",
                            "startDate": "2026-03-23",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-website-4",
                            "text": "CMS modular blocks",
                            "status": "later",
                            "contributors": [
                                "Subhrajit",
                                "Vivek"
                            ],
                            "note": "Creating reusable page sections.",
                            "usecase": "Speeds up website content creation.",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-website-5",
                            "text": "VAPT fixes remediation",
                            "status": "next",
                            "contributors": [
                                "Vivek",
                                "Manish"
                            ],
                            "note": "Closing security issues found in testing.",
                            "usecase": "Strengthens website safety.",
                            "startDate": "2026-03-23",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-website-6",
                            "text": "Crypto redirection security improvements",
                            "status": "next",
                            "contributors": [
                                "Vivek"
                            ],
                            "note": "Adding stronger redirect protection.",
                            "usecase": "Prevents wrong or unsafe redirects.",
                            "startDate": "2026-03-23",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-website-7",
                            "text": "Template-based event pages",
                            "status": "later",
                            "contributors": [
                                "Vivek"
                            ],
                            "note": "Planning reusable event page designs.",
                            "usecase": "Makes future event pages faster to build.",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-website-8",
                            "text": "Events listing and joining via Web Zoom SDK",
                            "status": "later",
                            "contributors": [
                                "Subhrajit"
                            ],
                            "note": "Allow users to join Zoom events directly from the website without OTP login. Authentication is done via a secure app-generated code or QR code scan.",
                            "usecase": "1. Display upcoming events on the website.2. User selects an event to join.3. System generates a unique session token (JWT) for the user.4. Token can be retrieved via scanning QR code or app code.",
                            "publishedDate": "2026-03-20"
                        }
                    ]
                },
                {
                    "name": "50Above50 Website",
                    "items": [
                        {
                            "id": "platform-50above50-website-0",
                            "text": "Missing Pulse events tracking",
                            "status": "now",
                            "contributors": [
                                "Manish"
                            ],
                            "note": "Adding missing activity tracking events.",
                            "usecase": "Improves campaign and funnel analysis.",
                            "startDate": "2026-03-23",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-50above50-website-1",
                            "text": "VAPT fixes remediation",
                            "status": "next",
                            "contributors": [
                                "Vivek",
                                "Manish"
                            ],
                            "note": "Fixing issues found in security testing.",
                            "usecase": "Improves website security.",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "text": "In-app transition",
                            "status": "later",
                            "contributors": [
                                "Vivek"
                            ],
                            "note": "Planning the move into the app journey.",
                            "usecase": "Gives users a smoother app experience.",
                            "id": "platform-50above50-website-2",
                            "startDate": "2026-03-20",
                            "due": "2026-03-27"
                        }
                    ]
                },
                {
                    "name": "50Above50 CRM",
                    "items": [
                        {
                            "id": "platform-50above50-crm-0",
                            "text": "Zoho CRM Data Migration",
                            "status": "now",
                            "contributors": [
                                "Manish"
                            ],
                            "note": "Enhancing the speed and reliability of CRM data synchronization during migration.",
                            "usecase": "Ensures CRM data is accurate, up-to-date, and reliable for reporting and decision-making.",
                            "startDate": "2026-03-20",
                            "due": "2026-03-24",
                            "publishedDate": "2026-03-20"
                        }
                    ]
                },
                {
                    "name": "Manage Admin",
                    "items": []
                },
                {
                    "name": "API",
                    "items": [
                        {
                            "id": "platform-api-0",
                            "text": "Membership status sync via Razorpay to Pulse",
                            "status": "now",
                            "contributors": [
                                "Manish"
                            ],
                            "note": "Capturing all membership status updates (e.g., initiated, charged, started, cancelled, expired) and sending them to Pulse via Razorpay webhook triggers.",
                            "usecase": "Provides complete visibility of the user membership lifecycle for better tracking, automation, and engagement.",
                            "startDate": "2026-03-20",
                            "due": "2026-03-23",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-api-4",
                            "text": "VAPT fixes implementation",
                            "status": "next",
                            "contributors": [
                                "Vivek",
                                "Manish"
                            ],
                            "note": "Fixing security findings in the API.",
                            "usecase": "Improves platform safety.",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-api-5",
                            "text": "Centerstage API",
                            "status": "now",
                            "contributors": [
                                "Vivek",
                                "Manish"
                            ],
                            "note": "Planned support for a future product area.",
                            "usecase": "Prepares for future expansion.",
                            "startDate": "2026-03-23",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-api-6",
                            "text": "Centerstage: Queue architecture",
                            "status": "now",
                            "contributors": [
                                "Vivek",
                                "Manish"
                            ],
                            "note": "Improving how work is processed in the backend.",
                            "usecase": "Makes the system more scalable.",
                            "startDate": "2026-03-25",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-api-7",
                            "text": "Centerstage: Chat / Messenger backend",
                            "status": "next",
                            "contributors": [
                                "Manish",
                                "Vivek"
                            ],
                            "note": "Planning the backend for chat features.",
                            "usecase": "Enables future messaging support.",
                            "startDate": "2026-03-30",
                            "due": "2026-04-03",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-api-8",
                            "text": "Support for app-code authentication in API",
                            "status": "later",
                            "contributors": [
                                "Vivek"
                            ],
                            "note": "Allow users to authenticate via a temporary app-generated code or QR code instead of OTP or password. This will enable seamless login and joining of events via the Web Zoom SDK.",
                            "usecase": "1. User generates a temporary app code from the mobile app.2. User submits the app code to the API endpoint.3. API validates the code and issues a short-lived JWT token.",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "platform-api-9",
                            "text": "Streaks",
                            "status": "later",
                            "contributors": [
                                "Manish",
                                "Vivek"
                            ],
                            "note": "Track consecutive user activity (like attending events, completing tasks, or participating in sessions) to encourage engagement and reward consistency.",
                            "usecase": "1. Track daily/weekly participation of users in events or platform activities.2. Increment streak count when user performs the required action consecutively.3. Show streaks on user dashboard to motivate engagement.4. Optionally, provide rewards or badges for achieving streak milestones.5. Reset streak if the user misses a day/session.",
                            "publishedDate": "2026-03-20"
                        }
                    ]
                },
                {
                    "name": "Adhoc (Community Support, Data Extraction Support, Emailers, Others)",
                    "items": []
                }
            ]
        },
        {
            "id": "pulse",
            "name": "Pulse (Analytics & CDP)",
            "theme": "violet",
            "subtracks": [
                {
                    "name": "Others",
                    "items": []
                },
                {
                    "name": "Analytics – Users",
                    "items": []
                },
                {
                    "name": "Analytics – Events",
                    "items": []
                },
                {
                    "name": "Analytics – Segment / Cohort",
                    "items": []
                },
                {
                    "name": "Journey",
                    "items": [
                        {
                            "id": "pulse-journey-0",
                            "text": "Custom Expression Support in Journey",
                            "status": "later",
                            "contributors": [
                                "Nikhil",
                                "Subhrajit"
                            ],
                            "note": "Enable dynamic logic creation within user journeys using custom expressions for advanced personalization and decision-making.",
                            "usecase": "Allow defining dynamic conditions to control journey flow, enabling personalized actions and branching based on user data.",
                            "publishedDate": "2026-03-20"
                        }
                    ]
                },
                {
                    "name": "Campaign",
                    "items": []
                },
                {
                    "name": "AI Agents",
                    "items": [
                        {
                            "id": "pulse-ai-agents-0",
                            "text": "Sales Agent – Specific Tours Pilot launch tesing, stakeholder alignment",
                            "status": "now",
                            "contributors": [
                                "Susmit",
                                "Pritish",
                                "Nikhil"
                            ],
                            "note": "Preparing for internal pilot testing by aligning stakeholders and refining prompts, responses, and data based on initial feedback.",
                            "usecase": "Ensures the system is validated internally before full rollout.",
                            "startDate": "2026-03-20",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-ai-agents-1",
                            "text": "Prompt & conversation refinement",
                            "status": "now",
                            "contributors": [
                                "Pritish",
                                "Susmit"
                            ],
                            "note": "Finalizing conversation scripts including sales pitch, closure, and intent/ratings handling.",
                            "usecase": "Improves quality of conversations and increases chances of successful conversions.",
                            "startDate": "2026-03-23",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-ai-agents-2",
                            "text": "Plivo setup for India & recording feasibility",
                            "status": "now",
                            "contributors": [
                                "Susmit"
                            ],
                            "note": "Setting up Plivo for Indian numbers and checking recording support and associated costs. Manual recording remains a fallback option.",
                            "usecase": "Enables scalable calling infrastructure for India with clarity on recording capabilities.",
                            "startDate": "2026-03-18",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-ai-agents-3",
                            "text": "Call recording feasibility",
                            "status": "now",
                            "contributors": [
                                "Nikhil",
                                "Susmit"
                            ],
                            "note": "Exploring call recording setup with Plivo, including feasibility and cost. Manual recording is possible but requires additional effort.",
                            "usecase": "Helps review calls, improve quality, and maintain records for training and compliance.",
                            "startDate": "2026-03-18",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-ai-agents-4",
                            "text": "AI Assistant 2.0",
                            "status": "later",
                            "contributors": [
                                "Nikhil"
                            ],
                            "note": "Upgrading the AI assistant with improved intelligence, context handling, and response quality.",
                            "usecase": "Provides smarter, more contextual assistance to enhance user engagement and support.",
                            "publishedDate": "2026-03-20"
                        }
                    ]
                },
                {
                    "name": "CDP",
                    "items": [
                        {
                            "id": "pulse-cdp-0",
                            "text": "Gold Tier feature engineering",
                            "status": "now",
                            "contributors": [
                                "Nikhil"
                            ],
                            "note": "Preparing important data features.",
                            "usecase": "Supports better analytics and predictions.",
                            "startDate": "2026-03-20",
                            "due": "2026-03-25",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-cdp-1",
                            "text": "Gold Tier data models",
                            "status": "now",
                            "contributors": [
                                "Nikhil"
                            ],
                            "note": "Defining the structure for Gold Tier data.",
                            "usecase": "Keeps data organized for use.",
                            "startDate": "2026-03-20",
                            "due": "2026-03-25",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-cdp-2",
                            "text": "Gold Tier metrics",
                            "status": "now",
                            "contributors": [
                                "Nikhil"
                            ],
                            "note": "Defining key measures for Gold Tier.",
                            "usecase": "Helps track performance clearly.",
                            "startDate": "2026-03-20",
                            "due": "2026-03-25",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-cdp-3",
                            "text": "Dashboards",
                            "status": "now",
                            "contributors": [
                                "Nikhil"
                            ],
                            "note": "Publishing user-facing dashboards with key metrics and insights.",
                            "usecase": "Makes data-driven insights easily accessible for teams to monitor performance and make informed decisions.",
                            "startDate": "2026-03-20",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-cdp-4",
                            "text": "Recommendation: ML Feature Engineering",
                            "status": "now",
                            "contributors": [
                                "Rushikesh"
                            ],
                            "note": "Building and finalizing ~50 ML features including propensity, time-series, standard deviation, and averages.",
                            "usecase": "Improves model accuracy and strength of recommendations.",
                            "startDate": "2026-03-20",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "text": "Recommendation: Persona Engine Integration",
                            "status": "now",
                            "contributors": [
                                "Rushikesh"
                            ],
                            "due": "27 Mar 2026",
                            "note": "Integrating long-term and contextual memory using Mem0 and Neo4j.",
                            "usecase": "Enables deeper personalization based on user memory and behavior.",
                            "id": "pulse-cdp-5",
                            "startDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-cdp-6",
                            "text": "Recommendation: Predictive Recommendation Engine (Cold Data)",
                            "status": "next",
                            "contributors": [
                                "Rushikesh"
                            ],
                            "note": "Building recommendation models using historical (cold) data.",
                            "usecase": "Predicts user needs and preferences proactively.",
                            "startDate": "2026-03-20",
                            "due": "2026-04-03",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "pulse-cdp-7",
                            "text": "Recommendation: Contextual Recommendation Engine (Hot Data)",
                            "status": "next",
                            "contributors": [
                                "Rushikesh"
                            ],
                            "note": "Developing real-time recommendations based on live (hot) data.",
                            "usecase": "Delivers real-time, context-aware recommendations to improve engagement.",
                            "startDate": "2026-04-06",
                            "due": "2026-04-10",
                            "publishedDate": "2026-03-20"
                        }
                    ]
                },
                {
                    "name": "Pages – Headless CMS",
                    "note": "A centralized content system enabling teams to create once and reuse content across the platform without engineering dependency.",
                    "items": []
                },
                {
                    "name": "Flow",
                    "items": [
                        {
                            "text": "Personalization in Flow",
                            "status": "later",
                            "contributors": [
                                "Nikhil"
                            ],
                            "note": "Introducing personalization within flows using user data and behavior.",
                            "usecase": "Enables dynamic, user-specific journeys to improve engagement and outcomes.",
                            "id": "pulse-flow-0",
                            "startDate": "2026-03-20",
                            "due": "2026-03-27"
                        }
                    ]
                }
            ]
        },
        {
            "id": "devops",
            "name": "DevOps & Infrastructure",
            "theme": "emerald",
            "subtracks": [
                {
                    "name": "Infrastructure & Security",
                    "items": [
                        {
                            "text": "AWS cost optimization",
                            "status": "now",
                            "contributors": [
                                "Raj"
                            ],
                            "note": "Reducing cloud costs across environments.",
                            "usecase": "Improves cost efficiency.",
                            "id": "devops-infrastructure-&-security-0",
                            "startDate": "2026-03-20",
                            "due": "2026-03-27"
                        },
                        {
                            "id": "devops-infrastructure-&-security-1",
                            "text": "Khyaal Tours redirect issue investigation",
                            "status": "done",
                            "contributors": [
                                "Raj"
                            ],
                            "note": "Root cause analysis completed and potential issue identified; fix is being worked on.\n\nhttps://khyaal.atlassian.net/wiki/x/AYAKI",
                            "usecase": "Helps resolve incorrect redirection and ensures users reach the correct website.",
                            "startDate": "2026-03-02",
                            "due": "2026-03-04",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "task-1774000413314",
                            "text": "All application specific dashboards",
                            "status": "now",
                            "contributors": [
                                "Raj"
                            ],
                            "startDate": "2026-03-20",
                            "due": "2026-03-27",
                            "publishedDate": "2026-03-20"
                        },
                        {
                            "id": "task-1774000457133",
                            "text": "Move Qdrant and Assistant Service from AWS to GCP",
                            "status": "next",
                            "contributors": [
                                "Raj"
                            ],
                            "publishedDate": "2026-03-20"
                        }
                    ]
                }
            ]
        }
    ]
};

exports.handler = async (event) => {
    // Standard CORS headers
    const resHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600',
        'Content-Type': 'application/json'
    };

    // Determine HTTP Method
    const method = (event.requestContext && event.requestContext.http && event.requestContext.http.method) || event.httpMethod || 'UNKNOWN';

    // Handle Preflight (OPTIONS) request
    if (method === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: resHeaders,
            body: ''
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { passwordHash } = body;

        const isAuthenticated = (passwordHash === EXPECTED_PASSWORD_HASH);

        return {
            statusCode: 200,
            headers: resHeaders,
            body: JSON.stringify({ 
                authenticated: isAuthenticated,
                data: isAuthenticated ? UPDATE_DATA : null
            }),
        };
    } catch (error) {
        console.error('Error in auth Lambda:', error);
        return {
            statusCode: 500,
            headers: resHeaders,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
