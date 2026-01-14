// // import React, { useState, useEffect } from "react";
// // import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

// // interface Notification {
// //   id: number;
// //   message: string;
// //   type: "warning" | "success" | "error";
// //   timestamp: string;
// // }

// // // Random mock notifications generator
// // const generateNotifications = (count = 6) => {
// //   const messages = [
// //     "Agent-3 requires immediate assistance on call ID:12345",
// //     "High sentiment drop detected in Chat session",
// //     "New router issue reported – needs supervisor review",
// //     "Voice Agent performance below threshold (29%)",
// //     "Customer satisfaction score dropped to 45%",
// //     "Unresolved ticket pending for over 15 minutes",
// //   ];

// //   const types = ["warning", "success", "error"] as const;

// //   return Array.from({ length: count }, (_, i) => ({
// //     id: i + 1,
// //     message: messages[Math.floor(Math.random() * messages.length)],
// //     type: types[Math.floor(Math.random() * types.length)],
// //     timestamp: new Date(
// //       Date.now() - Math.floor(Math.random() * 3600000)
// //     ).toLocaleTimeString(),
// //   }));
// // };

// // const Notifications: React.FC = () => {
// //   const [notifications, setNotifications] = useState<Notification[]>([]);
// //   const [isLoading, setIsLoading] = useState(true);

// //   useEffect(() => {
// //     const loadNotifications = async () => {
// //       setIsLoading(true);

// //       try {
// //         const res = await fetch(`/api/notifications`);
// //         if (res.ok) {
// //           const data = await res.json();
// //           if (Array.isArray(data) && data.length > 0) {
// //             setNotifications(data);
// //           } else throw new Error("Invalid notifications");
// //         } else throw new Error("API failed");
// //       } catch {
// //         console.warn("Notifications API failed → using random data");
// //         setNotifications(generateNotifications());
// //       }

// //       setIsLoading(false);
// //     };

// //     loadNotifications();
// //   }, []);

// //   const handleConfirm = (id: number) => {
// //     setNotifications((prev) => prev.filter((n) => n.id !== id));
// //     // TODO: Call API to mark as confirmed
// //   };

// //   const handleReject = (id: number) => {
// //     setNotifications((prev) => prev.filter((n) => n.id !== id));
// //     // TODO: Call API to reject
// //   };

// //   const getIconAndColor = (type: string) => {
// //     switch (type) {
// //       case "success":
// //         return {
// //           icon: CheckCircle,
// //           color: "text-green-600 bg-green-50 border-green-200",
// //         };
// //       case "error":
// //         return {
// //           icon: XCircle,
// //           color: "text-red-600 bg-red-50 border-red-200",
// //         };
// //       default:
// //         return {
// //           icon: AlertCircle,
// //           color: "text-amber-600 bg-amber-50 border-amber-200",
// //         };
// //     }
// //   };

// //   return (
// //     <div className="backdrop-blur-md bg-white/80 rounded-3xl p-6 shadow-xl border border-teal-100">
// //       <h2 className="text-2xl font-semibold text-teal-800 mb-6">
// //         Notifications
// //       </h2>

// //       {isLoading ? (
// //         <div className="space-y-4">
// //           {[...Array(4)].map((_, i) => (
// //             <div
// //               key={i}
// //               className="animate-pulse bg-gray-200/70 rounded-2xl h-24"
// //             />
// //           ))}
// //         </div>
// //       ) : notifications.length === 0 ? (
// //         <p className="text-center text-gray-500 py-8">No new notifications</p>
// //       ) : (
// //         <div className="space-y-4 max-h-96 overflow-y-auto">
// //           {notifications.map((notif) => {
// //             const { icon: Icon, color } = getIconAndColor(notif.type);

// //             return (
// //               <div
// //                 key={notif.id}
// //                 className={`rounded-2xl p-4 border ${color} flex items-start gap-4 hover:shadow-md transition-all`}
// //               >
// //                 <Icon className="w-8 h-8 shrink-0 mt-1" />

// //                 <div className="flex-1">
// //                   <p className="text-gray-800 font-medium">{notif.message}</p>
// //                   <p className="text-sm text-gray-500 mt-1">
// //                     {notif.timestamp}
// //                   </p>
// //                 </div>

// //                 <div className="flex gap-2 shrink-0">
// //                   <button
// //                     onClick={() => handleReject(notif.id)}
// //                     className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all text-sm font-medium"
// //                   >
// //                     Reject
// //                   </button>
// //                   <button
// //                     onClick={() => handleConfirm(notif.id)}
// //                     className="px-4 py-2 bg-teal-100 text-teal-700 rounded-xl hover:bg-teal-200 transition-all text-sm font-medium"
// //                   >
// //                     Confirm
// //                   </button>
// //                 </div>
// //               </div>
// //             );
// //           })}
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default Notifications;
// // components/NotificationsPanel.tsx
// import React, { useState, useEffect } from "react";
// import { Bell, CheckCircle, XCircle, AlertCircle } from "lucide-react";
// type NotificationType = "warning" | "error" | "success";

// interface Notification {
//   id: number;
//   message: string;
//   type: NotificationType;
//   time: string;
// }
// interface NotificationsProps {
//   isOpen: boolean;
//   onClose: () => void;
// }
// // Mock data generator
// const generateMockNotifications = (count = 5) => {
//   const messages = [
//     "Agent-3 requires assistance on call ID:12345",
//     "High sentiment drop in Chat session #789",
//     "Router issue detected – review required",
//     "Voice Agent performance below 40%",
//     "Customer satisfaction score dropped",
//   ];

//   return Array.from({ length: count }, (_, i) => ({
//     id: i + 1,
//     message: messages[Math.floor(Math.random() * messages.length)],
//     type: ["warning", "error", "success"][Math.floor(Math.random() * 3)],
//     time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit",
//     }),
//   }));
// };
// const types: NotificationType[] = ["warning", "error", "success"];

// interface NotificationsProps {
//   isOpen: boolean;
//   onClose: () => void;
// }

// const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     if (!isOpen) return;

//     const fetchNotifications = async () => {
//       setIsLoading(true);

//       try {
//         const res = await fetch("/api/notifications");
//         if (res.ok) {
//           const data = await res.json();
//           setNotifications(Array.isArray(data) ? data : []);
//         } else throw new Error("Failed");
//       } catch {
//         console.warn("Notifications API failed → using mock");
//         setNotifications(generateMockNotifications());
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchNotifications();
//   }, [isOpen]);

//   const handleAction = (id: number, action: "confirm" | "reject") => {
//     setNotifications(prev => prev.filter(n => n.id !== id));
//     // TODO: Call real API
//     console.log(`Notification ${id} ${action}ed`);
//   };

//   const getStyle = (type: string) => {
//     switch (type) {
//       case "success": return "bg-green-50 border-green-200 text-green-800";
//       case "error": return "bg-red-50 border-red-200 text-red-800";
//       default: return "bg-amber-50 border-amber-200 text-amber-800";
//     }
//   };

//   return (
//     <>
//       {/* Overlay (closes on click outside) */}
//       {isOpen && (
//         <div
//           className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
//           onClick={onClose}
//         />
//       )}

//       {/* Side Panel */}
//       <div
//         className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white/95 backdrop-blur-lg shadow-2xl border-l border-teal-100 transform transition-transform duration-300 z-50 ${
//           isOpen ? "translate-x-0" : "translate-x-full"
//         }`}
//       >
//         <div className="p-6 flex flex-col h-full">
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-2xl font-semibold text-teal-800">Notifications</h2>
//             <button
//               onClick={onClose}
//               className="text-gray-500 hover:text-teal-600 transition"
//             >
//               <XCircle className="w-8 h-8" />
//             </button>
//           </div>

//           {isLoading ? (
//             <div className="space-y-4">
//               {[...Array(5)].map((_, i) => (
//                 <div key={i} className="animate-pulse bg-gray-200 rounded-2xl h-24" />
//               ))}
//             </div>
//           ) : notifications.length === 0 ? (
//             <div className="text-center py-12 text-gray-500">
//               No new notifications
//             </div>
//           ) : (
//             <div className="space-y-4 overflow-y-auto flex-1 pr-2">
//               {notifications.map((notif) => (
//                 <div
//                   key={notif.id}
//                   className={`rounded-2xl p-4 border ${getStyle(notif.type)} flex items-start gap-4 hover:shadow-md transition-all`}
//                 >
//                   <div className="mt-1">
//                     {notif.type === "success" ? (
//                       <CheckCircle className="w-6 h-6 text-green-600" />
//                     ) : notif.type === "error" ? (
//                       <XCircle className="w-6 h-6 text-red-600" />
//                     ) : (
//                       <AlertCircle className="w-6 h-6 text-amber-600" />
//                     )}
//                   </div>

//                   <div className="flex-1">
//                     <p className="text-gray-800 font-medium">{notif.message}</p>
//                     <p className="text-sm text-gray-500 mt-1">{notif.time}</p>
//                   </div>

//                   <div className="flex gap-2 shrink-0">
//                     <button
//                       onClick={() => handleAction(notif.id, "reject")}
//                       className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 text-sm font-medium transition"
//                     >
//                       Reject
//                     </button>
//                     <button
//                       onClick={() => handleAction(notif.id, "confirm")}
//                       className="px-4 py-2 bg-teal-100 text-teal-700 rounded-xl hover:bg-teal-200 text-sm font-medium transition"
//                     >
//                       Confirm
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   );
// };

// export default Notifications;
// components/NotificationsPanel.tsx
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

type NotificationType = "warning" | "error" | "success";

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  time: string;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock generator with correct types
const generateMockNotifications = (count = 5): Notification[] => {
  const messages = [
    "Agent-3 requires assistance on call ID:12345",
    "High sentiment drop in Chat session #789",
    "Router issue detected – review required",
    "Voice Agent performance below 40%",
    "Customer satisfaction score dropped",
  ];

  const types: NotificationType[] = ["warning", "error", "success"];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    message: messages[Math.floor(Math.random() * messages.length)],
    type: types[Math.floor(Math.random() * types.length)],
    time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
};

const Notifications: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchNotifications = async () => {
      setIsLoading(true);

      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          // Validate type safety
          const validData = Array.isArray(data)
            ? data.filter(
                (n: Record<string, unknown>) =>
                  typeof n.id === "number" &&
                  typeof n.message === "string" &&
                  ["warning", "error", "success"].includes(n.type as string) &&
                  typeof n.time === "string"
              )
            : [];
          setNotifications(validData as Notification[]);
        } else throw new Error("API failed");
      } catch  {
        console.warn("Notifications API failed → using mock data");
        setNotifications(generateMockNotifications());
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [isOpen]);

  const handleAction = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getStyle = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-800";
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "error":
        return <XCircle className="w-6 h-6 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-6 h-6 text-amber-600" />;
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white/95 backdrop-blur-lg shadow-2xl border-l border-teal-100 transform transition-transform duration-300 z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-teal-800">Notifications ({notifications.length})</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-teal-600">
              <X className="w-8 h-8" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 rounded-2xl h-24" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No new notifications</p>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`rounded-2xl p-4 border ${getStyle(notif.type)} flex items-start gap-4 hover:shadow-md transition-all`}
                >
                  {getIcon(notif.type)}
                  <div className="flex-1">
                    <p className="font-medium">{notif.message}</p>
                    <p className="text-sm text-gray-500 mt-1">{notif.time}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(notif.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 text-sm font-medium"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(notif.id)}
                      className="px-4 py-2 bg-teal-100 text-teal-700 rounded-xl hover:bg-teal-200 text-sm font-medium"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Notifications;