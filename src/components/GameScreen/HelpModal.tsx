interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}>&times;</button>
                <h2>How to Use Type Refiner</h2>
                <div className="help-section">
                <h3>Basic Usage</h3>
                <ul>
                    <li>Type the words shown in the display area</li>
                    <li>Press space to move to the next word</li>
                    <li>Backspace to correct mistakes</li>
                </ul>

                <h3>Features</h3>
                <ul>
                    <li><strong>Strict Mode:</strong> Must complete words perfectly before moving on</li>
                    <li><strong>Hide Targets:</strong> Hide highlighted problem areas</li>
                    <li><strong>Dark Mode:</strong> Toggle dark/light theme</li>
                </ul>

                <h3>Performance Tracking</h3>
                <ul>
                    <li>Tracks your typing speed (WPM)</li>
                    <li>Monitors accuracy</li>
                    <li>Identifies problem letters and combinations</li>
                    <li>Shows targeted practice areas based on your performance</li>
                </ul>
                </div>
            </div>
        </div>
    );
};