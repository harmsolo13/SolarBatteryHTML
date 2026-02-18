#!/usr/bin/env python3
"""
Complete fix for tab 5 closing structure
"""

# Read the HTML
with open('BatteryROI_6.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# The issue is that tab 5 doesn't have proper closing
# Currently it ends with:
#                 </>;       // closes forecast IIFE return
#               })()}        // closes forecast IIFE call
#             </div>
#       </div>

# But it should end with:
#                 </>;       // closes forecast IIFE return
#               })()}        // closes forecast IIFE call
#             </div>         // closes the forecast wrapper
#           </>;             // closes the main tab 5 IIFE return
#         })()}              // closes the main tab 5 IIFE call
#       </>}                 // closes tab 5 conditional

# Find the current ending pattern
old_ending = """                </>;
              })()}
            </div>

      </div>
    </div>"""

new_ending = """                </>;
              })()}
            </div>

          </>;
        })()}
      </>}

      </div>
    </div>"""

html_content = html_content.replace(old_ending, new_ending)

# Write back
with open('BatteryROI_6.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("[OK] Fixed tab 5 closing structure!")
print("\nAdded proper closing for:")
print("1. Main tab 5 IIFE return (</>;)")
print("2. Main tab 5 IIFE call (})())")
print("3. Tab 5 conditional (</>})")
print("\nTab 5 should now load without errors!")
