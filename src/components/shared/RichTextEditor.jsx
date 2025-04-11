import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { getAvailableTemplateVariables } from '../../services/api/emailSenderService';

/**
 * Éditeur de texte enrichi avec support pour les variables
 * @param {Object} props - Propriétés du composant
 * @param {string} props.value - Valeur actuelle de l'éditeur
 * @param {Function} props.onChange - Fonction appelée quand la valeur change
 * @param {string} props.placeholder - Texte d'espace réservé
 * @param {string} props.signature - Signature à insérer (facultatif)
 * @param {Function} props.onFileSelect - Fonction appelée quand un fichier est sélectionné pour l'upload (facultatif)
 * @returns {JSX.Element} - Composant d'éditeur riche
 */
const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = 'Commencez à écrire...', 
  signature,
  onFileSelect
}) => {
  const [editorValue, setEditorValue] = useState(value || '');
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const variableMenuRef = useRef(null);
  const quillRef = useRef(null);
  const [variables] = useState(getAvailableTemplateVariables());

  useEffect(() => {
    setEditorValue(value || '');
  }, [value]);

  useEffect(() => {
    // Gérer les clics en dehors du menu de variables
    const handleClickOutside = (event) => {
      if (variableMenuRef.current && !variableMenuRef.current.contains(event.target)) {
        setShowVariableMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (content) => {
    setEditorValue(content);
    onChange(content);
  };

  const insertVariable = (variable) => {
    const editor = quillRef.current.getEditor();
    const cursorPosition = editor.getSelection()?.index || 0;
    
    editor.insertText(cursorPosition, `{{${variable.key}}}`);
    editor.setSelection(cursorPosition + variable.key.length + 4);
    
    setShowVariableMenu(false);
  };

  const insertSignature = () => {
    if (!signature) return;
    
    const editor = quillRef.current.getEditor();
    const cursorPosition = editor.getSelection()?.index || editor.getLength();
    
    // Insérer un saut de ligne avant la signature si on n'est pas au début
    if (cursorPosition > 0) {
      editor.insertText(cursorPosition, '\n\n');
      editor.insertText(cursorPosition + 2, signature);
    } else {
      editor.insertText(cursorPosition, signature);
    }
  };

  // Configuration des modules pour ReactQuill
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ]
    }
  };

  return (
    <div className="rich-text-editor relative">
      <div className="flex items-center mb-2 space-x-2">
        <button
          type="button"
          onClick={() => setShowVariableMenu(!showVariableMenu)}
          className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Insérer variable
        </button>
        
        {signature && (
          <button
            type="button"
            onClick={insertSignature}
            className="px-3 py-1 text-sm font-medium bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Insérer signature
          </button>
        )}
        
        {onFileSelect && (
          <button
            type="button"
            onClick={() => document.getElementById('file-upload').click()}
            className="px-3 py-1 text-sm font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Joindre un fichier
          </button>
        )}
        
        {onFileSelect && (
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onFileSelect(e.target.files[0]);
              }
            }}
          />
        )}
      </div>

      {showVariableMenu && (
        <div 
          ref={variableMenuRef}
          className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg p-2 max-h-60 overflow-y-auto w-64"
        >
          <h3 className="text-sm font-medium text-gray-700 mb-2">Variables disponibles</h3>
          <div className="space-y-1">
            {variables.map((variable) => (
              <button
                key={variable.key}
                onClick={() => insertVariable(variable)}
                className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
              >
                <span className="font-medium">{`{{${variable.key}}}`}</span>
                <span className="text-gray-500 ml-2">{variable.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ReactQuill
        ref={quillRef}
        value={editorValue}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        className="min-h-[200px] bg-white"
      />
    </div>
  );
};

export default RichTextEditor; 