

import Syllabus from "@/components/lms/Syllabus";
import BorderLine from "@/components/lms/BorderLine";
import GatewaySection from "@/components/lms/GatewaySection";
import CustomList from "@/components/lms/CustomList";
import RichText from "@/components/lms/RichText";
// import Price from "@/components/lms/Price";
import WhyStandApart from "@/components/lms/WhyStandApart";
import HeroSection from "@/components/lms/HeroSection";
import HeroSectionEditor from "@/components/lms/HeroSectionEditor";
import TableWithHeader from "@/components/lms/TableWithHeader";
import DraggableTable from "@/components/lms/table";
import ImageSection from "@/components/lms/ImageSection";
import CustomText from "@/components/lms/CustomText";
import VideoSection from "@/components/lms/VideoSection";
import IconTextSection from "@/components/lms/IconSection";
import ButtonSection from "@/components/lms/ButtonSection"
// import RichTextSection from "@/components/lms/RichTextSection";
import Container from "@/components/lms/TwoColumnMediaSection";
import NextPrevNavigation from "@/components/lms/PageNavigationSection"
export const puckConfig = {
 components: {
 NextPrevNavigation: {
  label: "Next / Previous Navigation",
  render: (props) => {
    return (
      <NextPrevNavigation
        prevLabel={props.prevLabel}
        prevLink={props.prevLink}
        prevBg={props.prevBg}
        prevColor={props.prevColor}
        nextLabel={props.nextLabel}
        nextLink={props.nextLink}
        nextBg={props.nextBg}
        nextColor={props.nextColor}
        padding={props.padding}
        borderRadius={props.borderRadius}
        fontSize={props.fontSize}
        align={props.align}
        stackMobile={props.stackMobile === "true"}
      />
    );
  },
  fields: {
    prevLabel: { type: "text", label: "Previous Label" },
    prevLink: { type: "text", label: "Previous Link URL" },
    prevBg: { type: "text", label: "Previous Button Background", defaultValue: "#e5e7eb" },
    prevColor: { type: "text", label: "Previous Button Text Color", defaultValue: "#111827" },

    nextLabel: { type: "text", label: "Next Label" },
    nextLink: { type: "text", label: "Next Link URL" },
    nextBg: { type: "text", label: "Next Button Background", defaultValue: "#dc2626" },
    nextColor: { type: "text", label: "Next Button Text Color", defaultValue: "#ffffff" },

    padding: { type: "text", label: "Padding", defaultValue: "12px 18px" },
    borderRadius: { type: "text", label: "Border Radius", defaultValue: "8px" },
    fontSize: { type: "text", label: "Font Size", defaultValue: "14px" },

    align: {
      type: "select",
      label: "Alignment",
      defaultValue: "space-between",
      options: [
        { label: "Space Between", value: "space-between" },
        { label: "Center", value: "center" },
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },

    stackMobile: {
      type: "select",
      label: "Stack on Mobile",
      defaultValue: "true",
      options: [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
      ],
    },
  },
},

  RichText: {
  label: "Text (Bold & Link)",
  render: (props) => <RichText {...props} />,
  fields: {
    content: {
      type: "textarea",
      label: "Text Content (HTML supported)",
      defaultValue:
        'This is <strong>bold</strong> text and <a href="https://example.com" target="_blank">this is a link</a>.',
    },

    tag: {
      type: "select",
      label: "HTML Tag",
      defaultValue: "div",
      options: [
        { label: "Div", value: "div" },
        { label: "Paragraph", value: "p" },
        { label: "Span", value: "span" },
        { label: "H1", value: "h1" },
        { label: "H2", value: "h2" },
        { label: "H3", value: "h3" },
      ],
    },

    color: {
      type: "text",
      label: "Text Color",
      defaultValue: "#000000",
    },

    backgroundColor: {
      type: "text",
      label: "Background Color",
      defaultValue: "transparent",
    },

    fontSize: {
      type: "text",
      label: "Desktop Font Size",
      defaultValue: "16px",
    },

    mobileFontSize: {
      type: "text",
      label: "Mobile Font Size",
      defaultValue: "14px",
    },

    lineHeight: {
      type: "text",
      label: "Line Height",
      defaultValue: "1.6",
    },

    textAlign: {
      type: "select",
      label: "Text Alignment",
      defaultValue: "left",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
        { label: "Justify", value: "justify" },
      ],
    },

    linkColor: {
      type: "text",
      label: "Link Color",
      defaultValue: "#2563eb",
    },

    linkHoverColor: {
      type: "text",
      label: "Link Hover Color",
      defaultValue: "#1e40af",
    },

    maxWidth: {
      type: "text",
      label: "Max Width",
      defaultValue: "100%",
    },

    margin: {
      type: "text",
      label: "Margin",
      defaultValue: "0 auto",
    },
  },
},

CustomList: {
  label: "List",
  render: (props) => <CustomList {...props} />,
  fields: {
    items: {
      type: "textarea",
      label: "List Items (one per line)",
      defaultValue: "Item 1\nItem 2\nItem 3",
    },

    listType: {
      type: "select",
      label: "List Type",
      defaultValue: "ul-disc",
      options: [
        { label: "Bullet (Disc)", value: "ul-disc" },
        { label: "Bullet (Circle)", value: "ul-circle" },
        { label: "Bullet (Square)", value: "ul-square" },

        { label: "Number (1, 2, 3)", value: "ol-decimal" },
        { label: "Number (01, 02, 03)", value: "ol-decimal-leading-zero" },
        { label: "Roman (I, II, III)", value: "ol-roman" },
        { label: "Alphabet (A, B, C)", value: "ol-alpha" },

        { label: "Check List", value: "check" },
        { label: "Arrow List", value: "arrow" },
        { label: "Star List", value: "star" },
      ],
    },

    color: {
      type: "text",
      label: "Text Color",
      defaultValue: "#000000",
    },

    markerColor: {
      type: "text",
      label: "Marker Color",
      defaultValue: "#000000",
    },

    fontSize: {
      type: "text",
      label: "Desktop Font Size",
      defaultValue: "16px",
    },

    mobileFontSize: {
      type: "text",
      label: "Mobile Font Size",
      defaultValue: "14px",
    },

    fontWeight: {
      type: "select",
      label: "Font Weight",
      defaultValue: "400",
      options: [
        { label: "Light", value: "300" },
        { label: "Regular", value: "400" },
        { label: "Medium", value: "500" },
        { label: "Bold", value: "700" },
      ],
    },

    lineHeight: {
      type: "text",
      label: "Line Height",
      defaultValue: "1.6",
    },

    textAlign: {
      type: "select",
      label: "Text Alignment",
      defaultValue: "left",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },

    gap: {
      type: "text",
      label: "Item Spacing",
      defaultValue: "8px",
    },

    maxWidth: {
      type: "text",
      label: "Max Width",
      defaultValue: "100%",
    },

    margin: {
      type: "text",
      label: "Margin",
      defaultValue: "0",
    },
  },
},



IconTextSection: {
  label: "Icon + Text",
  render: (props) => <IconTextSection {...props} />,
  fields: {
    iconUrl: {
      type: "custom",
      label: "Icon Image",
      render: ({ value, onChange }) => {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch("/api/upload-image", {
                  method: "POST",
                  body: formData,
                });

                const data = await res.json();
                if (data.url) onChange(data.url);
              }}
            />

            {value && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Delete icon?")) return;
                  const fileKey = value.split(".com/")[1];

                  await fetch("/api/upload-image", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileKey }),
                  });

                  onChange("");
                }}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  border: "none",
                  width: "fit-content",
                }}
              >
                Delete Icon
              </button>
            )}
          </div>
        );
      },
    },

    text: {
      type: "text",
      label: "Text",
    },

    position: {
      type: "select",
      label: "Icon Position",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
        { label: "Top", value: "top" },
        { label: "Bottom", value: "bottom" },
      ],
    },

    size: {
      type: "text",
      label: "Icon Size (e.g. 40px)",
    },

    gap: {
      type: "text",
      label: "Gap (e.g. 10px)",
    },

    textAlign: {
      type: "select",
      label: "Text Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  },
},


Container: {
  label: "Container",
  render: (props) => <Container {...props} />,
  fields: {
    sectionPadding: {
      type: "text",
      label: "Section Padding",
      defaultValue: "20px",
    },
    sectionBackground: {
      type: "text",
      label: "Section Background",
      defaultValue: "#FEECFE",
    },
    gap: {
      type: "text",
      label: "Gap Between Columns",
      defaultValue: "10px",
    },
    align: {
      type: "select",
      label: "Vertical Align",
      options: [
        { label: "Top", value: "flex-start" },
        { label: "Center", value: "center" },
        { label: "Bottom", value: "flex-end" },
      ],
    },
    columns: {
      type: "select",
      label: "Number of Columns",
      defaultValue: "1",
      options: [
        { label: "1 Column", value: "1" },
        { label: "2 Columns", value: "2" },
        { label: "3 Columns", value: "3" },
      ],
    },
    col1Width: {
      type: "number",
      label: "Column 1 Width (%)",
      defaultValue: 50,
      min: 10,
      max: 90,
    },

    /* ========= COLUMN 1 ========= */
    col1Bg: { type: "text", label: "Column 1 Background", defaultValue: "transparent" },
    col1MarginTop: { type: "text", label: "Col 1 Margin Top", defaultValue: "0px" },
    col1MarginRight: { type: "text", label: "Col 1 Margin Right", defaultValue: "0px" },
    col1MarginBottom: { type: "text", label: "Col 1 Margin Bottom", defaultValue: "0px" },
    col1MarginLeft: { type: "text", label: "Col 1 Margin Left", defaultValue: "0px" },
    col1PaddingTop: { type: "text", label: "Col 1 Padding Top", defaultValue: "0px" },
    col1PaddingRight: { type: "text", label: "Col 1 Padding Right", defaultValue: "0px" },
    col1PaddingBottom: { type: "text", label: "Col 1 Padding Bottom", defaultValue: "0px" },
    col1PaddingLeft: { type: "text", label: "Col 1 Padding Left", defaultValue: "0px" },
    /* ===== COLUMN 1 BORDER ===== */
col1BorderTop: {
  type: "text",
  label: "Col 1 Border Top Width",
  defaultValue: "0px",
},
col1BorderRight: {
  type: "text",
  label: "Col 1 Border Right Width",
  defaultValue: "0px",
},
col1BorderBottom: {
  type: "text",
  label: "Col 1 Border Bottom Width",
  defaultValue: "0px",
},
col1BorderLeft: {
  type: "text",
  label: "Col 1 Border Left Width",
  defaultValue: "0px",
},
col1BorderStyle: {
  type: "select",
  label: "Col 1 Border Style",
  defaultValue: "solid",
  options: [
    { label: "Solid", value: "solid" },
    { label: "Dashed", value: "dashed" },
    { label: "Dotted", value: "dotted" },
    { label: "Double", value: "double" },
  ],
},
col1BorderColor: {
  type: "text",
  label: "Col 1 Border Color",
  defaultValue: "#000000",
},


    /* ========= COLUMN 2 ========= */
    col2Bg: { type: "text", label: "Column 2 Background", defaultValue: "transparent" },
    col2MarginTop: { type: "text", label: "Col 2 Margin Top", defaultValue: "0px" },
    col2MarginRight: { type: "text", label: "Col 2 Margin Right", defaultValue: "0px" },
    col2MarginBottom: { type: "text", label: "Col 2 Margin Bottom", defaultValue: "0px" },
    col2MarginLeft: { type: "text", label: "Col 2 Margin Left", defaultValue: "0px" },
    col2PaddingTop: { type: "text", label: "Col 2 Padding Top", defaultValue: "0px" },
    col2PaddingRight: { type: "text", label: "Col 2 Padding Right", defaultValue: "0px" },
    col2PaddingBottom: { type: "text", label: "Col 2 Padding Bottom", defaultValue: "0px" },
    col2PaddingLeft: { type: "text", label: "Col 2 Padding Left", defaultValue: "0px" },
    /* ===== COLUMN 1 BORDER ===== */
col2BorderTop: {
  type: "text",
  label: "Col 2 Border Top Width",
  defaultValue: "0px",
},
col2BorderRight: {
  type: "text",
  label: "Col 2 Border Right Width",
  defaultValue: "0px",
},
col2BorderBottom: {
  type: "text",
  label: "Col 2 Border Bottom Width",
  defaultValue: "0px",
},
col2BorderLeft: {
  type: "text",
  label: "Col 2 Border Left Width",
  defaultValue: "0px",
},
col2BorderStyle: {
  type: "select",
  label: "Col 2 Border Style",
  defaultValue: "solid",
  options: [
    { label: "Solid", value: "solid" },
    { label: "Dashed", value: "dashed" },
    { label: "Dotted", value: "dotted" },
    { label: "Double", value: "double" },
  ],
},
col2BorderColor: {
  type: "text",
  label: "Col 2 Border Color",
  defaultValue: "#000000",
},


    /* ========= COLUMN 3 ========= */
    col3Bg: { type: "text", label: "Column 3 Background", defaultValue: "transparent" },
    col3MarginTop: { type: "text", label: "Col 3 Margin Top", defaultValue: "0px" },
    col3MarginRight: { type: "text", label: "Col 3 Margin Right", defaultValue: "0px" },
    col3MarginBottom: { type: "text", label: "Col 3 Margin Bottom", defaultValue: "0px" },
    col3MarginLeft: { type: "text", label: "Col 3 Margin Left", defaultValue: "0px" },
    col3PaddingTop: { type: "text", label: "Col 3 Padding Top", defaultValue: "0px" },
    col3PaddingRight: { type: "text", label: "Col 3 Padding Right", defaultValue: "0px" },
    col3PaddingBottom: { type: "text", label: "Col 3 Padding Bottom", defaultValue: "0px" },
    col3PaddingLeft: { type: "text", label: "Col 3 Padding Left", defaultValue: "0px" },
/* ===== COLUMN 1 BORDER ===== */
col3BorderTop: {
  type: "text",
  label: "Col 3 Border Top Width",
  defaultValue: "0px",
},
col3BorderRight: {
  type: "text",
  label: "Col 3 Border Right Width",
  defaultValue: "0px",
},
col3BorderBottom: {
  type: "text",
  label: "Col 3 Border Bottom Width",
  defaultValue: "0px",
},
col3BorderLeft: {
  type: "text",
  label: "Col 3 Border Left Width",
  defaultValue: "0px",
},
col3BorderStyle: {
  type: "select",
  label: "Col 3 Border Style",
  defaultValue: "solid",
  options: [
    { label: "Solid", value: "solid" },
    { label: "Dashed", value: "dashed" },
    { label: "Dotted", value: "dotted" },
    { label: "Double", value: "double" },
  ],
},
col3BorderColor: {
  type: "text",
  label: "Col 3 Border Color",
  defaultValue: "#000000",
},

    
  },
},



  ImageSection: {
  render: (props) => <ImageSection {...props} />,
  fields: {
   imageUrl: {
  type: "custom",
  label: "Image",
 render: ({ value, onChange }) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* File Input for Uploading */}
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Delete old image from AWS before uploading new one
            if (value) {
              try {
                const oldFileKey = value.split(".com/")[1];
                if (oldFileKey) {
                  await fetch("/api/upload-image", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileKey: oldFileKey }),
                  });
                  console.log("Old image deleted from AWS");
                }
              } catch (err) {
                console.warn("Failed to delete old image:", err);
                // Continue with upload even if delete fails
              }
            }

            // Upload new image
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload-image", {
              method: "POST",
              body: formData
            });

            const data = await res.json();
            if (data.url) {
              onChange(data.url);
            }
          }}
        />

        {/* Delete Button - Only shows if an image exists */}
        {value && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Are you sure you want to delete this image?")) return;

              // Extract the file key from the URL
              const fileKey = value.split(".com/")[1];

              try {
                const res = await fetch("/api/upload-image", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fileKey }),
                });

                if (res.ok) {
                  onChange(""); // Clear the image from Puck state
                  alert("Image deleted successfully from AWS");
                } else {
                  const errorData = await res.json();
                  alert(`Delete failed: ${errorData.error}`);
                }
              } catch (err) {
                console.error("Delete request failed", err);
                alert("Failed to delete image");
              }
            }}
            style={{
              padding: "6px 12px",
              backgroundColor: "#ff4d4f",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              width: "fit-content"
            }}
          >
            Delete Current Image
          </button>
        )}
      </div>
    );
  }
},

    altText: {
      type: "text",
      label: "Alt Text (SEO Important)"
    },

    width: {
      type: "text",
      label: "Width (e.g. 100%, 800px)"
    },

    height: {
      type: "text",
      label: "Height (e.g. 400px)"
    },

    objectFit: {
      type: "select",
      label: "Image Fit",
      options: [
        { label: "Cover", value: "cover" },
        { label: "Contain", value: "contain" },
        { label: "Fill", value: "fill" },
        { label: "None", value: "none" }
      ]
    },

    position: {
      type: "select",
      label: "Image Position",
      options: [
        { label: "Center", value: "center" },
        { label: "Top", value: "top" },
        { label: "Bottom", value: "bottom" },
        { label: "Left", value: "left" },
        { label: "Right", value: "right" }
      ]
    },

    overlayColor: {
      type: "text",
      label: "Overlay (rgba or gradient)"
    },

    borderRadius: {
      type: "text",
      label: "Border Radius (e.g. 16px)"
    }
  }
},

DraggableTable: {
  render: (props) => <DraggableTable {...props} />,
  fields: {
    rows: {
      type: "number",
      label: "Rows",
      min: 1,
      max: 20
    },

    cols: {
      type: "number",
      label: "Columns",
      min: 1,
      max: 10
    },

    textAlign: {
      type: "select",
      label: "Horizontal Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" }
      ]
    },

    verticalAlign: {
      type: "select",
      label: "Vertical Align",
      options: [
        { label: "Top", value: "top" },
        { label: "Middle", value: "middle" },
        { label: "Bottom", value: "bottom" }
      ]
    },

    headerSize: {
      type: "text",
      label: "Header Font Size (e.g. 18px)"
    },

    headerColor: {
      type: "text",
      label: "Header Text Color"
    },

    cellBg: {
      type: "text",
      label: "Cell Background Color"
    },

    altRowColor: {
      type: "text",
      label: "Alternate Row Color"
    },

    cellPadding: {
      type: "text",
      label: "Cell Padding (e.g. 12px)"
    },

    minCellHeight: {
      type: "text",
      label: "Min Cell Height (e.g. 80px)"
    }
  }
},

  TableWithHeader: {
  render: (props) => <TableWithHeader {...props} />,
  fields: {
    rows: {
      type: "number",
      label: "Number of Rows",
      min: 0,
      max: 10,
    },
    cols: {
      type: "number",
      label: "Number of Columns",
      min: 2,
      max: 20,
    },

    headerBg: {
      type: "text",
      label: "Header Background Color",
    },
    headerText: {
      type: "text",
      label: "Header Text Color",
    },

    rowBg: {
      type: "text",
      label: "Row Background Color",
    },
    altRowBg: {
      type: "text",
      label: "Alternate Row Background",
    },

    borderColor: {
      type: "text",
      label: "Border Color",
    },
  },
},

  HeroSectionEditor: {
  render: (props) => <HeroSectionEditor {...props} />,

  defaultProps: {
    backgroundImage: "",
    cols: "2",
    rows: "2",
    gap: "20px",
    width: "1200px",
    alignX: "center"
  },

  fields: {
    backgroundImage: {
      type: "text",
      label: "Background Image URL"
    },

    cols: {
      type: "select",
      label: "Columns",
      options: [
        { label: "1 Column", value: "1" },
        { label: "2 Columns", value: "2" },
        { label: "3 Columns", value: "3" }
      ]
    },

    rows: {
      type: "select",
      label: "Rows",
      options: [
        { label: "1 Row", value: "1" },
        { label: "2 Rows", value: "2" },
        { label: "3 Rows", value: "3" }
      ]
    },

    gap: {
      type: "text",
      label: "Grid Gap (e.g. 20px)"
    },

    width: {
      type: "text",
      label: "Container Max Width"
    },

    alignX: {
      type: "select",
      label: "Horizontal Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" }
      ]
    }
  }
},

CustomText: {
  label: "Custom Text",
  render: (props) => <CustomText {...props} />,
  fields: {
    content: {
      type: "textarea",
      label: "Text Content",
      defaultValue: "Add your text here",
    },

    tag: {
      type: "select",
      label: "HTML Tag",
      defaultValue: "p",
      options: [
        { label: "H1", value: "h1" },
        { label: "H2", value: "h2" },
        { label: "H3", value: "h3" },
        { label: "H4", value: "h4" },
        { label: "H5", value: "h5" },
        { label: "H6", value: "h6" },
        { label: "Paragraph", value: "p" },
        { label: "Span", value: "span" },
      ],
    },

    color: {
      type: "text",
      label: "Text Color",
      defaultValue: "#000000",
    },

    backgroundColor: {
      type: "text",
      label: "Background Color",
      defaultValue: "transparent",
    },

    fontSize: {
      type: "text",
      label: "Desktop Font Size",
      defaultValue: "16px",
    },

    mobileFontSize: {
      type: "text",
      label: "Mobile Font Size",
      defaultValue: "14px",
    },

    fontWeight: {
      type: "select",
      label: "Font Weight",
      defaultValue: "400",
      options: [
        { label: "Light", value: "300" },
        { label: "Regular", value: "400" },
        { label: "Medium", value: "500" },
        { label: "Semi Bold", value: "600" },
        { label: "Bold", value: "700" },
      ],
    },

    lineHeight: {
      type: "text",
      label: "Line Height",
      defaultValue: "1.5",
    },

    letterSpacing: {
      type: "text",
      label: "Letter Spacing",
      defaultValue: "0px",
    },

    textAlign: {
      type: "select",
      label: "Text Alignment",
      defaultValue: "left",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
        { label: "Justify", value: "justify" },
      ],
    },

    textTransform: {
      type: "select",
      label: "Text Transform",
      defaultValue: "none",
      options: [
        { label: "None", value: "none" },
        { label: "Uppercase", value: "uppercase" },
        { label: "Lowercase", value: "lowercase" },
        { label: "Capitalize", value: "capitalize" },
      ],
    },

    maxWidth: {
      type: "text",
      label: "Max Width",
      defaultValue: "100%",
    },

    /* ===== MARGIN CONTROLS ===== */
    marginTop: {
      type: "text",
      label: "Margin Top",
      defaultValue: "0px",
    },
    marginRight: {
      type: "text",
      label: "Margin Right",
      defaultValue: "auto",
    },
    marginBottom: {
      type: "text",
      label: "Margin Bottom",
      defaultValue: "0px",
    },
    marginLeft: {
      type: "text",
      label: "Margin Left",
      defaultValue: "auto",
    },

    /* ===== PADDING CONTROLS ===== */
    paddingTop: {
      type: "text",
      label: "Padding Top",
      defaultValue: "0px",
    },
    paddingRight: {
      type: "text",
      label: "Padding Right",
      defaultValue: "0px",
    },
    paddingBottom: {
      type: "text",
      label: "Padding Bottom",
      defaultValue: "0px",
    },
    paddingLeft: {
      type: "text",
      label: "Padding Left",
      defaultValue: "0px",
    },
  },
},
//  this is video section 
  VideoSection: {
      label: "YouTube Video",
      render: (props) => <VideoSection {...props} />,
      fields: {
        videoUrl: {
          type: "text",
          label: "YouTube Video URL",
        },

        aspectRatio: {
          type: "select",
          label: "Aspect Ratio",
          defaultValue: "16/9",
          options: [
            { label: "16 : 9", value: "16/9" },
            { label: "4 : 3", value: "4/3" },
            { label: "1 : 1", value: "1/1" },
          ],
        },

        autoplay: {
          type: "select",
          label: "Autoplay",
          defaultValue: "false",
          options: [
            { label: "No", value: "false" },
            { label: "Yes", value: "true" },
          ],
        },

        controls: {
          type: "select",
          label: "Show Controls",
          defaultValue: "true",
          options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ],
        },

        maxWidth: {
          type: "text",
          label: "Max Width (e.g. 900px)",
          defaultValue: "100%",
        },

        borderRadius: {
          type: "text",
          label: "Border Radius (e.g. 16px)",
          defaultValue: "0px",
        },

        align: {
          type: "select",
          label: "Alignment",
          defaultValue: "center",
          options: [
            { label: "Center", value: "center" },
            { label: "Left", value: "left" },
            { label: "Right", value: "right" },
          ],
        },
      },
    },


    ButtonSection: {
  label: "Button",
  render: (props) => <ButtonSection {...props} />,
  fields: {
    label: {
      type: "text",
      label: "Button Text",
      defaultValue: "Click Here",
    },

    link: {
      type: "text",
      label: "Button Link",
      defaultValue: "#",
    },

    target: {
      type: "select",
      label: "Open Link In",
      defaultValue: "_self",
      options: [
        { label: "Same Tab", value: "_self" },
        { label: "New Tab", value: "_blank" },
      ],
    },

    align: {
      type: "select",
      label: "Alignment",
      defaultValue: "center",
      options: [
        { label: "Center", value: "center" },
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },

    bgColor: {
      type: "text",
      label: "Background Color",
      defaultValue: "#e31818",
    },

    textColor: {
      type: "text",
      label: "Text Color",
      defaultValue: "#ffffff",
    },

    padding: {
      type: "text",
      label: "Padding",
      defaultValue: "10px 18px",
    },

    borderRadius: {
      type: "text",
      label: "Border Radius",
      defaultValue: "6px",
    },

    fontSize: {
      type: "text",
      label: "Font Size",
      defaultValue: "14px",
    },

    maxWidth: {
      type: "text",
      label: "Max Width",
      defaultValue: "100%",
    },
  },
},

    // 2. OTHER COMPONENTS
    HeroSection: {
      render: (props) => <HeroSection {...props} />,
      fields: {
        tag: { type: "text" },
        title: { type: "text" },
        subtitle: { type: "text" },
        description: { type: "textarea" },
        backgroundImage: { type: "text", label: "Background Image URL" },
      },
    },

    GatewaySection: {
      render: (props) => <GatewaySection {...props} />,
      fields: {
        heading: { type: "text" },
        highlight: { type: "text" },
        description: { type: "textarea" },
        image: { type: "text" },
      },
    },

    BorderLine: {
  label: "Border Line",
  render: (props) => <BorderLine {...props} />,
  fields: {
    orientation: {
      type: "select",
      label: "Orientation",
      defaultValue: "horizontal",
      options: [
        { label: "Horizontal", value: "horizontal" },
        { label: "Vertical", value: "vertical" }
      ]
    },

    color: {
      type: "text",
      label: "Line Color",
      defaultValue: "#000000"
    },

    length: {
      type: "text",
      label: "Length (e.g. 100%, 200px)",
      defaultValue: "100%"
    },

    thickness: {
      type: "text",
      label: "Thickness (e.g. 2px)",
      defaultValue: "2px"
    },

    styleType: {
      type: "select",
      label: "Line Style",
      defaultValue: "solid",
      options: [
        { label: "Solid", value: "solid" },
        { label: "Dotted", value: "dotted" },
        { label: "Dashed", value: "dashed" },
        { label: "Zigzag", value: "zigzag" }
      ]
    },

    /* ===== MARGIN ===== */
    marginTop: { type: "text", label: "Margin Top", defaultValue: "0px" },
    marginRight: { type: "text", label: "Margin Right", defaultValue: "0px" },
    marginBottom: { type: "text", label: "Margin Bottom", defaultValue: "0px" },
    marginLeft: { type: "text", label: "Margin Left", defaultValue: "0px" },

    /* ===== PADDING ===== */
    paddingTop: { type: "text", label: "Padding Top", defaultValue: "0px" },
    paddingRight: { type: "text", label: "Padding Right", defaultValue: "0px" },
    paddingBottom: { type: "text", label: "Padding Bottom", defaultValue: "0px" },
    paddingLeft: { type: "text", label: "Padding Left", defaultValue: "0px" }
  }
},


    WhyStandApart: {
      render: (props) => <WhyStandApart {...props} />,
      fields: {
        title: { type: "text" },
        card1Title: { type: "text" },
        card1Desc: { type: "textarea" },
        card2Title: { type: "text" },
        card2Desc: { type: "textarea" },
        card3Title: { type: "text" },
        card3Desc: { type: "textarea" },
        leftTitle: { type: "text" },
        leftDesc: { type: "textarea" },
        rightTitle: { type: "text" },
        rightDesc: { type: "textarea" },
        footerText: { type: "textarea" },
      },
    },

  


    Syllabus: {
      render: (props) => <Syllabus {...props} />,
      fields: {
        topics: {
          type: "array",
          item: {
            type: "object",
            fields: {
              text: { type: "text" }
            }
          }
        }
      }
    },
    
  },
};